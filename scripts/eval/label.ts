// label.ts - dev-only interactive CLI for human-rating GoldenSession transcripts;
// writes GoldenLabel rows to the database; run with: npx tsx scripts/eval/label.ts
//
// MANUAL LABELLING WORKFLOW:
//   1. Score 30-50 sessions normally (oversample expected-low-scoring sessions):
//      npx tsx scripts/eval/label.ts --rater=<your-id> [--limit=10]
//   2. Blind-re-score a 10-15 item subset for intra-rater reliability:
//      npx tsx scripts/eval/label.ts --rater=<your-id> --isRetest [--limit=15]
//      Correlation between original and retest scores is the human ceiling for AI judge accuracy.
//   Aim for roughly equal thirds across low / mid / high bands per metric, not a random draw.

import * as readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { prisma } from '../../src/lib/prisma';
import { JUDGED_METRIC_KEYS } from '../../src/lib/eval/golden.types';
import { RUBRIC_VERSION } from '../../src/lib/eval/rubricVersion';

// ─── Rubric anchors (inline for terminal display) ────────────────────────────
// Matches RUBRICS-v1.md band descriptors. Printed per-metric so the rater
// does not need to context-switch to another document.

const RUBRIC_ANCHORS: Record<string, { low: string; mixed: string; strong: string }> = {
  connectorRepetition: {
    low:    '1-3: Every clause joined with "and"/"so"/"but". No variety.',
    mixed:  '4-6: 3-4 different connectors but defaults to "so"/"and" under pressure.',
    strong: '7-10: Wide range — "however", "as a result", "that said" used naturally.',
  },
  structuralVariety: {
    low:    '1-3: Almost all Subject-Verb-Object. No complex clauses or relative clauses.',
    mixed:  '4-6: Some complex sentences but reverts to one structure under fluency pressure.',
    strong: '7-10: Genuine mix: relatives, passives, cleft sentences, conditionals, fronting.',
  },
  vocabularyPrecision: {
    low:    '1-3: Heavy reliance on "thing", "stuff", "good", "bad", "nice", "make".',
    mixed:  '4-6: Some precise vocabulary but falls back on fillers under pressure.',
    strong: '7-10: Consistently precise and contextually appropriate. Vague fallbacks rare.',
  },
  verbAccuracy: {
    low:    '1-3: Multiple recurring tense/agreement errors that impede understanding.',
    mixed:  '4-6: Mostly accurate but one or two verb patterns recur as errors.',
    strong: '7-10: Accurate throughout. Complex verb forms (conditionals, modal stacks) correct.',
  },
  argumentClosure: {
    low:    '1-3: Points raised but never closed. Multiple incomplete thoughts.',
    mixed:  '4-6: At least one argument arc visible but incomplete threads remain.',
    strong: '7-10: Every main point introduced, developed, and explicitly closed.',
  },
  lexicalSophistication: {
    low:    '1-3: Almost entirely high-frequency basic vocab: "good", "big", "make", "get".',
    mixed:  '4-6: Mix of high and mid-frequency. Occasional precise word but surrounded by fillers.',
    strong: '7-10: Consistent mid-to-low frequency academic vocab used naturally.',
  },
  registerPragmatics: {
    low:    '1-3: Register mismatches, no hedging, sounds blunt. Missing softeners.',
    mixed:  '4-6: Generally appropriate register, some hedging but inconsistent.',
    strong: '7-10: Register well-matched, hedging natural and varied, discourse functions smooth.',
  },
} as const;

// ─── Metric order ─────────────────────────────────────────────────────────────

// Ordered list the rater is prompted through per session.
// Derived from JUDGED_METRIC_KEYS but kept as a local const so the prompt order is explicit.
const JUDGED_METRICS = [
  'connectorRepetition',
  'structuralVariety',
  'vocabularyPrecision',
  'verbAccuracy',
  'argumentClosure',
  'lexicalSophistication',
  'registerPragmatics',
] as const satisfies typeof JUDGED_METRIC_KEYS;

type JudgedMetric = (typeof JUDGED_METRICS)[number];

// ─── CLI arg parsing ──────────────────────────────────────────────────────────

interface CliArgs {
  raterId: string;
  isRetest: boolean;
  limit: number;
}

function parseArgs(): CliArgs {
  const argv = process.argv.slice(2);

  const getFlag = (prefix: string): string | undefined => {
    const entry = argv.find((a) => a.startsWith(prefix));
    return entry !== undefined ? entry.slice(prefix.length) : undefined;
  };

  const raterFromArg = getFlag('--rater=');
  const raterId = raterFromArg ?? process.env['RATER_ID'] ?? '';

  if (raterId.trim() === '') {
    console.error(
      'Error: raterId is required.\n' +
        'Set --rater=<id> or export RATER_ID=<id> before running.\n' +
        'Usage: npx tsx scripts/eval/label.ts --rater=<id> [--isRetest] [--limit=10]',
    );
    process.exit(1);
  }

  const isRetest = argv.includes('--isRetest');

  const limitStr = getFlag('--limit=');
  const parsedLimit = limitStr !== undefined ? parseInt(limitStr, 10) : NaN;
  // Default: 10 for normal runs, 15 for retest runs (retest subset is smaller by design)
  const defaultLimit = isRetest ? 15 : 10;
  const limit = !Number.isNaN(parsedLimit) && parsedLimit > 0 ? parsedLimit : defaultLimit;

  return { raterId: raterId.trim(), isRetest, limit };
}

// ─── Session loading ──────────────────────────────────────────────────────────

interface GoldenSessionRow {
  id: string;
  cleanTranscript: string;
  verbatimTranscript: string | null;
  stratum: string;
  focusMetricKey: string | null;
  createdAt: Date;
}

async function loadUnlabelledSessions(
  raterId: string,
  limit: number,
): Promise<GoldenSessionRow[]> {
  // Load sessions that have NO GoldenLabel with this raterId and isRetest=false.
  return prisma.goldenSession.findMany({
    where: {
      labels: {
        none: { raterId, isRetest: false },
      },
    },
    orderBy: { createdAt: 'asc' },
    take: limit,
    select: {
      id: true,
      cleanTranscript: true,
      verbatimTranscript: true,
      stratum: true,
      focusMetricKey: true,
      createdAt: true,
    },
  });
}

async function loadRetestSessions(
  raterId: string,
  limit: number,
): Promise<GoldenSessionRow[]> {
  // Retest: sessions that already have at least one label from this rater (isRetest=false).
  // Shuffled in-memory (Fisher-Yates) so each retest run presents a random subset.
  // Prior scores are NOT selected — the query must not expose label data.
  const sessions = await prisma.goldenSession.findMany({
    where: {
      labels: {
        some: { raterId, isRetest: false },
      },
    },
    select: {
      id: true,
      cleanTranscript: true,
      verbatimTranscript: true,
      stratum: true,
      focusMetricKey: true,
      createdAt: true,
    },
  });

  // Fisher-Yates shuffle
  for (let i = sessions.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = sessions[i];
    const swp = sessions[j];
    if (tmp !== undefined && swp !== undefined) {
      sessions[i] = swp;
      sessions[j] = tmp;
    }
  }

  return sessions.slice(0, limit);
}

// ─── Input helpers ────────────────────────────────────────────────────────────

async function promptScore(
  rl: readline.Interface,
  metric: JudgedMetric,
): Promise<number> {
  while (true) {
    const raw = await rl.question('  Score (1-10): ');
    const n = parseInt(raw.trim(), 10);
    if (Number.isInteger(n) && n >= 1 && n <= 10) {
      return n;
    }
    console.log(`  Invalid score for "${metric}" — enter an integer between 1 and 10.`);
  }
}

async function promptRationale(rl: readline.Interface): Promise<string> {
  while (true) {
    const raw = await rl.question('  Rationale (one sentence): ');
    const trimmed = raw.trim();
    if (trimmed.length >= 10) {
      return trimmed;
    }
    console.log('  Rationale too short — at least 10 characters required.');
  }
}

// ─── Per-session labelling ────────────────────────────────────────────────────

async function labelSession(
  rl: readline.Interface,
  session: GoldenSessionRow,
  raterId: string,
  isRetest: boolean,
): Promise<number> {
  const wordCount = session.cleanTranscript.split(' ').length;
  const dateStr = session.createdAt.toISOString().slice(0, 10);

  console.log('\n' + '═'.repeat(72));
  console.log(`Session: ${session.id}`);
  console.log(`Date: ${dateStr}  |  Stratum: ${session.stratum}  |  Words: ~${wordCount}`);
  if (session.focusMetricKey !== null) {
    console.log(`Focus metric: ${session.focusMetricKey}`);
  }
  console.log('─'.repeat(72));
  console.log('\n[CLEAN TRANSCRIPT]\n');
  console.log(session.cleanTranscript);
  if (session.verbatimTranscript !== null && session.verbatimTranscript !== session.cleanTranscript) {
    console.log('\n[VERBATIM TRANSCRIPT]\n');
    console.log(session.verbatimTranscript);
  }
  console.log('\n' + '─'.repeat(72));

  let labelsWritten = 0;

  for (const metric of JUDGED_METRICS) {
    const anchors = metric in RUBRIC_ANCHORS ? RUBRIC_ANCHORS[metric] : undefined;

    console.log(`\n  Metric: ${metric}`);
    if (anchors !== undefined) {
      console.log(`    LOW    ${anchors.low}`);
      console.log(`    MIXED  ${anchors.mixed}`);
      console.log(`    STRONG ${anchors.strong}`);
    }

    const humanScore = await promptScore(rl, metric);
    const rationale = await promptRationale(rl);

    try {
      await prisma.goldenLabel.create({
        data: {
          goldenId: session.id,
          metric,
          humanScore,
          rationale,
          raterId,
          isRetest,
          rubricVersion: RUBRIC_VERSION,
        },
      });
      labelsWritten++;
    } catch (err) {
      console.error(
        `  DB error writing label for metric "${metric}":`,
        err instanceof Error ? err.message : err,
      );
      const decision = await rl.question('  [s]kip this metric / [a]bort session: ');
      if (decision.trim().toLowerCase().startsWith('a')) {
        console.log(`  Aborting session ${session.id}. ${labelsWritten} labels already written.`);
        return labelsWritten;
      }
      console.log('  Skipping this metric.');
    }
  }

  console.log(`\nSaved ${labelsWritten} labels for session ${session.id}.`);
  return labelsWritten;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const { raterId, isRetest, limit } = parseArgs();

  console.log('\n=== Golden Labelling Tool ===');
  console.log(`Rater:    ${raterId}`);
  console.log(`Mode:     ${isRetest ? 'RETEST (blind re-score)' : 'NORMAL'}`);
  console.log(`Limit:    ${limit} session(s)`);
  console.log(`Rubric:   ${RUBRIC_VERSION}  →  docs/eval/RUBRICS-v1.md`);
  console.log('Read RUBRICS-v1.md before scoring if this is your first run.\n');

  const sessions = isRetest
    ? await loadRetestSessions(raterId, limit)
    : await loadUnlabelledSessions(raterId, limit);

  if (sessions.length === 0) {
    console.log(
      isRetest
        ? 'No labelled sessions found for retest. Run normal mode first.'
        : 'No unlabelled sessions found. All sessions for this rater are already scored.',
    );
    return;
  }

  console.log(`Loaded ${sessions.length} session(s) to label.\n`);

  const rl = readline.createInterface({ input, output });

  let totalSessions = 0;
  let totalLabels = 0;

  try {
    for (const session of sessions) {
      const written = await labelSession(rl, session, raterId, isRetest);
      totalLabels += written;
      totalSessions++;
    }
  } finally {
    rl.close();
  }

  const expectedLabels = totalSessions * JUDGED_METRICS.length;
  console.log('\n' + '═'.repeat(72));
  console.log(
    `Labelling complete. Sessions scored: ${totalSessions}. ` +
      `Labels written: ${totalLabels} (expected ${expectedLabels}).`,
  );
}

main()
  .catch((err: unknown) => {
    console.error('Fatal:', err instanceof Error ? err.message : err);
    process.exit(1);
  })
  .finally(() => {
    void prisma.$disconnect();
  });
