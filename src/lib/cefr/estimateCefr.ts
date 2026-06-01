// Pure CEFR estimation from metric scores — no DB access, no side effects
import type { MetricKey } from '@/features/dashboard/dashboard.types';
import type { CefrEstimate, CefrLevel, MetricScoreInput, PillarBreakdown } from './cefr.types';

const PILLAR_METRICS: Record<keyof PillarBreakdown, readonly MetricKey[]> = {
  pronunciation: ['pronunciationAccuracy', 'prosodyScore'],
  language: [
    'connectorRepetition',
    'structuralVariety',
    'vocabularyPrecision',
    'verbAccuracy',
    'lexicalSophistication',
    'registerPragmatics',
  ],
  delivery: ['speakingRate', 'fillerUsage', 'argumentClosure'],
};

const PILLAR_KEYS_ORDERED: readonly (keyof PillarBreakdown)[] = [
  'pronunciation',
  'language',
  'delivery',
] as const;

const PILLAR_WEIGHTS: Record<keyof PillarBreakdown, number> = {
  pronunciation: 0.25,
  language: 0.5,
  delivery: 0.25,
};

function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

function computePillarScore(
  pillarKey: keyof PillarBreakdown,
  scores: Map<MetricKey, number>,
): number | null {
  const metricKeys = PILLAR_METRICS[pillarKey];
  const values = metricKeys
    .map((key) => scores.get(key))
    .filter((v): v is number => v !== undefined);

  return values.length > 0 ? mean(values) : null;
}

function determineCefrLevel(
  weightedAverage: number,
  allMetricsAboveThreshold: boolean,
): CefrLevel {
  if (allMetricsAboveThreshold && weightedAverage >= 8.5) return 'c2';
  if (weightedAverage >= 7.0) return 'c1-high';
  if (weightedAverage >= 5.5) return 'c1-mid';
  if (weightedAverage >= 4.0) return 'c1-low';
  return 'below-c1';
}

/**
 * Estimates a CEFR level from per-metric scores using weighted pillar averages.
 *
 * Pronunciation and delivery each contribute 25 %; language contributes 50 %.
 * Pillars with no data are excluded from the weighted sum rather than scoring zero.
 * `c2` requires every metric score ≥ 8.0 AND a weighted average ≥ 8.5.
 *
 * @param metrics - Array of `{ key, score }` objects on a 1–10 scale.
 * @returns A `CefrEstimate` with `level`, `weightedAverage`, and `pillarBreakdown`, or `null` if the input array is empty or all pillars lack data.
 * @example
 * estimateCefr([{ key: 'verbAccuracy', score: 8 }, { key: 'connectorRepetition', score: 7 }])
 * // => { level: 'c1-high', weightedAverage: 7.5, pillarBreakdown: { ... } }
 */
export function estimateCefr(metrics: MetricScoreInput[]): CefrEstimate | null {
  if (metrics.length === 0) return null;

  const scores = new Map<MetricKey, number>();
  for (const metric of metrics) {
    scores.set(metric.key, metric.score);
  }

  // Compute pillar scores (skip pillars with no data)
  const pillarScores: Partial<PillarBreakdown> = {};
  let weightedSum = 0;
  let totalWeight = 0;

  for (const pillarKey of PILLAR_KEYS_ORDERED) {
    const pillarScore = computePillarScore(pillarKey, scores);
    if (pillarScore !== null) {
      pillarScores[pillarKey] = pillarScore;
      weightedSum += pillarScore * PILLAR_WEIGHTS[pillarKey];
      totalWeight += PILLAR_WEIGHTS[pillarKey];
    }
  }

  if (totalWeight === 0) return null;

  const weightedAverage = weightedSum / totalWeight;
  const allAbove8 = metrics.every((m) => m.score >= 8.0);

  const breakdown: PillarBreakdown = {
    delivery: pillarScores.delivery ?? 0,
    language: pillarScores.language ?? 0,
    pronunciation: pillarScores.pronunciation ?? 0,
  };

  return {
    level: determineCefrLevel(weightedAverage, allAbove8),
    weightedAverage: Math.round(weightedAverage * 100) / 100,
    pillarBreakdown: breakdown,
  };
}
