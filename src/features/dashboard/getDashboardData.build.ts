// Pure computation helpers for getDashboardData: snapshot grouping, metric building, drill counts
import type { DashboardMetric, MetricKey, MetricLevel } from './dashboard.types';
import { computeTrend } from '@/features/dashboard/getDashboardHelpers';

const EMPTY_METRIC_COUNTS: Record<MetricKey, number> = {
  connectorRepetition: 0,
  structuralVariety: 0,
  vocabularyPrecision: 0,
  verbAccuracy: 0,
  argumentClosure: 0,
  fillerUsage: 0,
  lexicalSophistication: 0,
  registerPragmatics: 0,
  pronunciationAccuracy: 0,
  prosodyScore: 0,
  speakingRate: 0,
} as const;

type SnapshotRow = { key: string; score: number; level: string };
type DrillByMetricRow = { metricKey: string; _count: { _all: number } };
type FocusSession = { focusMetricKey: string | null } | null;

/** Groups flat snapshot rows into a Map keyed by MetricKey, capped at 7 entries each. */
export function groupSnapshotsByKey(
  snapshots: SnapshotRow[],
  metricKeys: MetricKey[],
  isMetricKey: (k: string) => k is MetricKey,
): Map<MetricKey, Array<{ score: number; level: string }>> {
  const map = new Map<MetricKey, Array<{ score: number; level: string }>>();
  for (const key of metricKeys) map.set(key, []);
  for (const snap of snapshots) {
    if (!isMetricKey(snap.key)) continue;
    const bucket = map.get(snap.key);
    if (bucket && bucket.length < 7) bucket.push(snap);
  }
  return map;
}

/** Normalises a raw level string to a valid MetricLevel, defaulting to 'medium'. */
function toMetricLevel(raw: string): MetricLevel {
  if (raw === 'low' || raw === 'medium' || raw === 'high') return raw;
  return 'medium';
}

/** Builds the full DashboardMetric array from grouped snapshot data. */
export function buildMetricsFromSnapshots(
  metricKeys: MetricKey[],
  metricLabels: Record<MetricKey, string>,
  snapshotsByKey: Map<MetricKey, Array<{ score: number; level: string }>>,
  todayFocusSession: FocusSession,
): DashboardMetric[] {
  return metricKeys.map((key) => {
    const snapshots = snapshotsByKey.get(key) ?? [];
    const history = snapshots.map((s) => s.score).reverse();
    const currentScore = history[history.length - 1] ?? 0;
    const rawLevel = snapshots[0]?.level ?? 'medium';
    const currentLevel = toMetricLevel(rawLevel);
    const trend = computeTrend(history);
    return {
      key,
      label: metricLabels[key],
      currentLevel,
      currentScore,
      trend,
      history,
      lastTrainedToday: todayFocusSession?.focusMetricKey === key,
    };
  });
}

/** Aggregates per-metric drill attempt counts from a groupBy result. */
export function buildDrillByMetricCounts(
  drillByMetric: DrillByMetricRow[],
  isMetricKey: (k: string) => k is MetricKey,
): Record<MetricKey, number> {
  const byMetric: Record<MetricKey, number> = { ...EMPTY_METRIC_COUNTS };
  for (const row of drillByMetric) {
    if (isMetricKey(row.metricKey)) byMetric[row.metricKey] = row._count._all;
  }
  return byMetric;
}
