// scripts/eval/report.ts
// Reads JudgeRun + GoldenLabel rows from Postgres, computes per-metric accuracy stats,
// prints a formatted table to stdout, and writes eval/REPORT-latest.json.
// Run: npm run eval:report  (uses tsx)

import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { prisma } from '../../src/lib/prisma';
import {
  computeMAE,
  computeWithinOne,
  computeSpearman,
  computeBandedQwk,
  bootstrapCI,
  computeIntraRaterCeiling,
} from '../../src/lib/eval/stats';
import { JUDGED_METRIC_KEYS } from '../../src/lib/eval/golden.types';
import type { JudgedMetricKey } from '../../src/lib/eval/golden.types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CIBounds { lower: number; upper: number }

interface MetricReport {
  metric: JudgedMetricKey;
  n: number;
  mae: number | null;
  maeCI: CIBounds | null;
  withinOne: number | null;
  withinOneCI: CIBounds | null;
  spearman: number | null;
  spearmanCI: CIBounds | null;
  bandedQwk: number | null;
  intraCeiling: number | null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

interface PairedScores {
  humanScores: number[];
  aiScores: number[];
  retestPairs: Array<{ firstScore: number; retestScore: number }>;
}

function buildPairs(
  judgeRuns: Array<{ goldenId: string; aiScore: number }>,
  goldenLabels: Array<{ goldenId: string; humanScore: number; isRetest: boolean }>,
): PairedScores {
  const humanMap = new Map<string, number>();
  for (const label of goldenLabels) {
    if (!label.isRetest) humanMap.set(label.goldenId, label.humanScore);
  }

  const retestPairs: Array<{ firstScore: number; retestScore: number }> = [];
  for (const label of goldenLabels) {
    if (!label.isRetest) continue;
    const first = humanMap.get(label.goldenId);
    if (first !== undefined) retestPairs.push({ firstScore: first, retestScore: label.humanScore });
  }

  const humanScores: number[] = [];
  const aiScores: number[] = [];
  for (const run of judgeRuns) {
    const h = humanMap.get(run.goldenId);
    if (h !== undefined) { humanScores.push(h); aiScores.push(run.aiScore); }
  }

  return { humanScores, aiScores, retestPairs };
}

function computeStats(metric: JudgedMetricKey, pairs: PairedScores): MetricReport {
  const { humanScores, aiScores, retestPairs } = pairs;

  if (humanScores.length === 0) {
    return {
      metric, n: 0,
      mae: null, maeCI: null,
      withinOne: null, withinOneCI: null,
      spearman: null, spearmanCI: null,
      bandedQwk: null, intraCeiling: null,
    };
  }

  const mae      = computeMAE(humanScores, aiScores);
  const maeCI    = bootstrapCI(humanScores, aiScores, computeMAE, { nResamples: 1000, seed: 42 });
  const withinOne   = computeWithinOne(humanScores, aiScores);
  const withinOneCI = bootstrapCI(humanScores, aiScores, computeWithinOne, { nResamples: 1000, seed: 43 });
  const spearman    = computeSpearman(humanScores, aiScores);
  const spearmanCI  = spearman !== null
    ? bootstrapCI(humanScores, aiScores, computeSpearman, { nResamples: 1000, seed: 44 })
    : null;

  return {
    metric,
    n: humanScores.length,
    mae,
    maeCI:       { lower: maeCI.lower, upper: maeCI.upper },
    withinOne,
    withinOneCI: { lower: withinOneCI.lower, upper: withinOneCI.upper },
    spearman,
    spearmanCI:  spearmanCI !== null ? { lower: spearmanCI.lower, upper: spearmanCI.upper } : null,
    bandedQwk:   computeBandedQwk(humanScores, aiScores),
    intraCeiling: computeIntraRaterCeiling(retestPairs),
  };
}

function printTable(reports: MetricReport[]): void {
  const COL = 100;
  console.log('\nAI Judge Accuracy Report');
  console.log('='.repeat(COL));
  console.log(
    'Metric'.padEnd(26),
    'N'.padStart(5),
    'MAE'.padStart(8),
    'Within-1'.padStart(10),
    'Spearman'.padStart(10),
    'BandedQWK'.padStart(11),
    'IntraCeil'.padStart(11),
  );
  console.log('-'.repeat(COL));
  for (const r of reports) {
    console.log(
      r.metric.padEnd(26),
      String(r.n).padStart(5),
      (r.mae !== null ? r.mae.toFixed(3) : 'n/a').padStart(8),
      (r.withinOne !== null ? (r.withinOne * 100).toFixed(1) + '%' : 'n/a').padStart(10),
      (r.spearman !== null ? r.spearman.toFixed(3) : 'n/a').padStart(10),
      (r.bandedQwk !== null ? r.bandedQwk.toFixed(3) : 'null').padStart(11),
      (r.intraCeiling !== null ? r.intraCeiling.toFixed(3) : 'n/a').padStart(11),
    );
  }
  console.log('='.repeat(COL));
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const reports: MetricReport[] = [];

  for (const metric of JUDGED_METRIC_KEYS) {
    const [judgeRuns, goldenLabels] = await Promise.all([
      prisma.judgeRun.findMany({ where: { metric }, select: { goldenId: true, aiScore: true } }),
      prisma.goldenLabel.findMany({
        where: { metric },
        select: { goldenId: true, humanScore: true, isRetest: true },
      }),
    ]);
    reports.push(computeStats(metric, buildPairs(judgeRuns, goldenLabels)));
  }

  printTable(reports);

  const evalDir    = join(process.cwd(), 'eval');
  const outputPath = join(evalDir, 'REPORT-latest.json');
  mkdirSync(evalDir, { recursive: true });
  writeFileSync(
    outputPath,
    JSON.stringify({ generatedAt: new Date().toISOString(), metrics: reports }, null, 2),
    'utf-8',
  );
  console.log(`\nReport written to ${outputPath}`);
  await prisma.$disconnect();
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
