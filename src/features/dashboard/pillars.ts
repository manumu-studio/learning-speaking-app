// Pillar config and score computation — groups 11 metrics into Delivery, Language, Pronunciation

export type { PillarKey, PillarConfig } from '@/lib/metrics/pillars';
export { PILLAR_CONFIG, PILLAR_KEYS, METRIC_LABELS } from '@/lib/metrics/pillars';

import type { PillarKey } from '@/lib/metrics/pillars';
import { PILLAR_CONFIG, PILLAR_KEYS } from '@/lib/metrics/pillars';
import type { DashboardMetric } from './dashboard.types';

export type PillarScore = {
  pillarKey: PillarKey;
  label: string;
  averageScore: number;
  delta: number;
  sparklineData: number[];
};

function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

function metricDelta(metric: DashboardMetric): number {
  const history = metric.history;
  if (history.length === 0) return 0;
  const lastSeven = history.slice(-7);
  const historyMean = mean(lastSeven);
  return metric.currentScore - historyMean;
}

function sparklineFromMetrics(metrics: DashboardMetric[]): number[] {
  const histories = metrics.map((m) => m.history).filter((h) => h.length > 0);
  if (histories.length === 0) return [];

  const minLength = Math.min(...histories.map((h) => h.length));
  const result: number[] = [];

  for (let i = 0; i < minLength; i += 1) {
    const valuesAtIndex = histories.map((h) => h[i]).filter((v): v is number => v !== undefined);
    result.push(mean(valuesAtIndex));
  }

  return result;
}

export function computePillarScores(metrics: DashboardMetric[]): PillarScore[] {
  return PILLAR_KEYS.map((pillarKey) => {
    const config = PILLAR_CONFIG[pillarKey];
    const constituents = metrics.filter((m) =>
      (config.metricKeys as readonly string[]).includes(m.key),
    );

    const scores = constituents.map((m) => m.currentScore);
    const averageScore = scores.length > 0 ? mean(scores) : 0;

    const deltas = constituents.map(metricDelta);
    const delta = deltas.length > 0 ? mean(deltas) : 0;

    const sparklineData = sparklineFromMetrics(constituents);

    return {
      pillarKey,
      label: config.label,
      averageScore,
      delta,
      sparklineData,
    };
  });
}
