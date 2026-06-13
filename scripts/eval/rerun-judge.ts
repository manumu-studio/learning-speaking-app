// Dev-only script: re-runs the Claude judge on an existing session, bypassing the Redis cache.
// Usage: npx tsx scripts/eval/rerun-judge.ts <sessionId>
// Prints the 7 judged metric scores for the session to stdout.
// Safe to run repeatedly — skipCache: true means no Redis reads or writes, so a prompt
// edit between runs produces different scores (the cache never short-circuits the judge).

import { z } from 'zod';
import { prisma } from '../../src/lib/prisma';
import { analyzeTranscript } from '../../src/lib/ai/analyze';
import type { PronunciationSummary } from '../../src/lib/ai/analyze';
import { buildPronunciationSummaryFromRows } from '../../src/lib/pipeline/pipelineHelpers';
// The 7 LLM-judged metric keys (excludes deterministic/Azure-computed keys). Single source of truth.
import { JUDGED_METRIC_KEYS } from '../../src/lib/eval/golden.types';

// Zod schema for the Json `phonemes` field on each WordPronunciation row.
const PhonemeRowSchema = z.array(
  z.object({ phoneme: z.string(), accuracyScore: z.number() }),
);

async function main(): Promise<void> {
  const sessionId = process.argv[2];
  if (sessionId === undefined || sessionId.trim() === '') {
    console.error('Usage: npx tsx scripts/eval/rerun-judge.ts <sessionId>');
    process.exit(1);
  }

  // Load the clean transcript plus the pronunciation report and its word rows.
  const session = await prisma.speakingSession.findUniqueOrThrow({
    where: { id: sessionId },
    select: {
      focusMetricKey: true,
      promptUsed: true,
      transcript: { select: { text: true } },
      pronunciationReport: {
        select: {
          accuracyScore: true,
          prosodyScore: true,
          words: {
            orderBy: { wordIndex: 'asc' },
            select: { phonemes: true, l1Tags: true },
          },
        },
      },
    },
  });

  const transcriptText = session.transcript?.text ?? '';
  if (transcriptText.trim() === '') {
    console.error(`Session ${sessionId} has no transcript text.`);
    process.exit(1);
  }

  // Rebuild the pronunciationSummary the judge originally saw, from persisted rows — via the
  // shared helper, so the mapping (weak-phoneme threshold, L1 tags) matches the live pipeline.
  let pronunciationSummary: PronunciationSummary | null = null;
  const report = session.pronunciationReport;
  if (report !== null) {
    const wordRows = report.words.map((w) => ({
      phonemes: PhonemeRowSchema.parse(w.phonemes),
      l1Tags: w.l1Tags,
    }));
    pronunciationSummary = buildPronunciationSummaryFromRows(
      { accuracyScore: report.accuracyScore, prosodyScore: report.prosodyScore },
      wordRows,
    );
  }

  console.log(`\nRe-running judge for session: ${sessionId}`);
  console.log(`Transcript length: ${transcriptText.length} chars`);
  console.log('skipCache: true (no Redis read or write)\n');

  const result = await analyzeTranscript({
    transcript: transcriptText,
    focusMetricKey: session.focusMetricKey ?? null,
    pronunciationSummary,
    promptUsed: session.promptUsed ?? null,
    skipCache: true,
  });

  // Print only the 7 judge-scored metrics.
  console.log('--- Judge scores ---');
  for (const key of JUDGED_METRIC_KEYS) {
    const metric = result.metrics.find((m) => m.key === key);
    if (metric !== undefined) {
      console.log(`  ${key}: ${metric.score}/10 (${metric.level}) — ${metric.note}`);
    } else {
      console.log(`  ${key}: NOT RETURNED by judge`);
    }
  }
  console.log('--------------------\n');
}

main()
  .catch((err: unknown) => {
    console.error('Fatal:', err instanceof Error ? err.message : err);
    process.exit(1);
  })
  .finally(() => {
    void prisma.$disconnect();
  });
