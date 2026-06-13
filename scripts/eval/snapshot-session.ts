// Freezes one or more SpeakingSession rows into GoldenSession eval records.
// Usage: npx tsx scripts/eval/snapshot-session.ts \
//   --sessions <id1,id2,...> --stratum <tag> --rubric <version>
// Idempotent: sessions already snapshotted under the same sourceSessionId are skipped.

import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { prisma } from '../../src/lib/prisma';
import { buildPronunciationSummaryFromRows } from '../../src/lib/pipeline/pipelineHelpers';
import { AzureRawJsonSchema } from '../../src/lib/eval/golden.types';
import type { GoldenInput } from '../../src/lib/eval/golden.types';
import { toInputJson } from '../../src/lib/prismaJson';

// Zod schema for the Json phonemes field on each WordPronunciation row
const PhonemeRowSchema = z.array(
  z.object({ phoneme: z.string(), accuracyScore: z.number() }),
);

// ─── CLI arg parsing ─────────────────────────────────────────────────

interface CliArgs {
  sessionIds: string[];
  stratum: string;
  rubricVersion: string;
}

function parseArgs(): CliArgs {
  const argv = process.argv.slice(2);
  const get = (flag: string): string | undefined => {
    const idx = argv.indexOf(flag);
    return idx !== -1 ? argv[idx + 1] : undefined;
  };

  const raw = get('--sessions');
  const stratum = get('--stratum');
  const rubricVersion = get('--rubric');

  if (raw == null || stratum == null || rubricVersion == null) {
    console.error(
      'Usage: snapshot-session.ts --sessions <id1,id2,...> --stratum <tag> --rubric <version>',
    );
    process.exit(1);
  }

  const sessionIds = raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  if (sessionIds.length === 0) {
    console.error('--sessions must be a non-empty comma-separated list');
    process.exit(1);
  }

  return { sessionIds, stratum, rubricVersion };
}

// ─── Session loader ──────────────────────────────────────────────────

interface WordRowData {
  accuracyScore: number;
  phonemes: unknown;
  l1Tags: string[];
}

interface ReportData {
  accuracyScore: number;
  prosodyScore: number;
  rawJson: unknown;
  words: WordRowData[];
}

interface SessionData {
  id: string;
  verbatimTranscript: string | null;
  promptUsed: string | null;
  focusMetricKey: string | null;
  transcript: { text: string } | null;
  pronunciationReport: ReportData | null;
}

async function loadSession(sessionId: string): Promise<SessionData | null> {
  return prisma.speakingSession.findUnique({
    where: { id: sessionId },
    select: {
      id: true,
      verbatimTranscript: true,
      promptUsed: true,
      focusMetricKey: true,
      transcript: { select: { text: true } },
      pronunciationReport: {
        select: {
          accuracyScore: true,
          prosodyScore: true,
          rawJson: true,
          words: {
            orderBy: { wordIndex: 'asc' },
            select: {
              accuracyScore: true,
              phonemes: true,
              l1Tags: true,
            },
          },
        },
      },
    },
  });
}

// ─── Core snapshot logic ─────────────────────────────────────────────

async function snapshotSession(
  session: SessionData,
  stratum: string,
  rubricVersion: string,
): Promise<'created' | 'skipped' | 'skipped-validation'> {
  // Idempotency check: skip if this source session is already snapshotted
  const existing = await prisma.goldenSession.findFirst({
    where: { sourceSessionId: session.id },
    select: { id: true },
  });

  if (existing != null) {
    console.log(`  ${session.id}: already snapshotted as ${existing.id} — skipping`);
    return 'skipped';
  }

  const cleanTranscript = session.transcript?.text ?? null;
  if (cleanTranscript == null) {
    console.warn(`  ${session.id}: no transcript found — skipping`);
    return 'skipped';
  }

  // Validate azureRawJson from the stored rawJson column.
  // PronunciationReport.rawJson stores toInputJson(rawUtterances), not a full PronunciationResult,
  // so AzureRawJsonSchema validation will only pass if words/scores are present in that payload.
  // Sessions failing validation are skipped (not thrown), per eval pipeline contract.
  let azureRawJson: GoldenInput['azureRawJson'] = null;

  if (session.pronunciationReport?.rawJson != null) {
    const parsed = AzureRawJsonSchema.safeParse(session.pronunciationReport.rawJson);
    if (!parsed.success) {
      console.warn(
        `  ${session.id}: azureRawJson failed validation — skipping`,
        parsed.error.flatten().fieldErrors,
      );
      return 'skipped-validation';
    }
    azureRawJson = parsed.data;
  }

  // Rebuild pronunciationSummary from the structured WordPronunciation rows.
  // rawJson stores toInputJson(rawUtterances) — it is NOT a PronunciationResult and does not
  // contain per-word data. The word-level phonemes and l1Tags live in WordPronunciation rows,
  // ordered by wordIndex. buildPronunciationSummaryFromRows mirrors buildPronunciationSummary
  // (same weak-phoneme threshold <60, 5-item cap) but sources from DB rows instead of a live result.
  let pronunciationSummary: string | null = null;
  const report = session.pronunciationReport;

  if (report !== null) {
    const wordRows = report.words.map((w) => ({
      phonemes: PhonemeRowSchema.parse(w.phonemes),
      l1Tags: w.l1Tags,
    }));
    const summary = buildPronunciationSummaryFromRows(
      { accuracyScore: report.accuracyScore, prosodyScore: report.prosodyScore },
      wordRows,
    );
    pronunciationSummary = JSON.stringify(summary);
  }

  const input: GoldenInput = {
    sourceSessionId: session.id,
    cleanTranscript,
    verbatimTranscript: session.verbatimTranscript,
    pronunciationSummary,
    azureRawJson,
    promptUsed: session.promptUsed,
    focusMetricKey: session.focusMetricKey,
    stratum,
    rubricVersion,
  };

  const golden = await prisma.goldenSession.create({
    data: {
      ...input,
      // azureRawJson is a `Json?` column: toInputJson coerces the validated object to a Prisma
      // InputJsonValue; absence maps to SQL NULL via Prisma.DbNull, not a JS null literal.
      azureRawJson:
        input.azureRawJson === null ? Prisma.DbNull : toInputJson(input.azureRawJson),
    },
  });
  console.log(`  ${session.id}: frozen into GoldenSession ${golden.id} (stratum=${stratum})`);
  return 'created';
}

// ─── Main ─────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const { sessionIds, stratum, rubricVersion } = parseArgs();

  console.log(
    `Snapshotting ${sessionIds.length} session(s) into stratum="${stratum}" rubric="${rubricVersion}"\n`,
  );

  let created = 0;
  let skipped = 0;
  let failed = 0;

  for (const sessionId of sessionIds) {
    const session = await loadSession(sessionId);

    if (session == null) {
      console.warn(`  ${sessionId}: session not found — skipping`);
      skipped++;
      continue;
    }

    try {
      const outcome = await snapshotSession(session, stratum, rubricVersion);
      if (outcome === 'created') {
        created++;
      } else {
        skipped++;
      }
    } catch (err) {
      console.error(
        `  ${sessionId}: unexpected error —`,
        err instanceof Error ? err.message : err,
      );
      failed++;
    }
  }

  console.log(`\nDone: ${created} created, ${skipped} skipped, ${failed} failed`);

  if (failed > 0) {
    process.exit(1);
  }
}

main()
  .catch((err: unknown) => {
    console.error('Snapshot failed:', err instanceof Error ? err.message : err);
    process.exit(1);
  })
  .finally(() => {
    void prisma.$disconnect();
  });
