// Helpers for GET /api/metrics/trends — snapshot grouping, data point building, and pillar trend computation
import { PILLAR_CONFIG, PILLAR_KEYS } from '@/features/dashboard/pillars';
import type { PillarKey } from '@/features/dashboard/pillars';
import type { TrendDataPoint, PillarTrend } from '@/lib/schemas/trends';

// ---------------------------------------------------------------------------
// Shared pure helpers
// ---------------------------------------------------------------------------

/** Round a number to one decimal place. */
export function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

/** Compute mean of a non-empty number array. */
export function mean(values: readonly number[]): number {
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

/** Format a Date to 'YYYY-MM-DD' in UTC. */
export function toDateString(date: Date): string {
  return date.toISOString().slice(0, 10);
}

// ---------------------------------------------------------------------------
// Snapshot grouping
// ---------------------------------------------------------------------------

type SnapshotRow = {
  key: string;
  score: number;
  session: { createdAt: Date };
};

export type DateMetricMap = Map<string, Map<string, number[]>>;

/**
 * Group metric snapshots by date → metric key → scores[].
 * Also returns a Set of unique date strings.
 */
export function groupSnapshotsByDate(snapshots: SnapshotRow[]): {
  dateMetricMap: DateMetricMap;
  sessionDates: Set<string>;
} {
  const dateMetricMap: DateMetricMap = new Map();
  const sessionDates = new Set<string>();

  for (const snap of snapshots) {
    const dateStr = toDateString(snap.session.createdAt);
    sessionDates.add(dateStr);

    let metricMap = dateMetricMap.get(dateStr);
    if (!metricMap) {
      metricMap = new Map<string, number[]>();
      dateMetricMap.set(dateStr, metricMap);
    }

    let scores = metricMap.get(snap.key);
    if (!scores) {
      scores = [];
      metricMap.set(snap.key, scores);
    }

    scores.push(snap.score);
  }

  return { dateMetricMap, sessionDates };
}

// ---------------------------------------------------------------------------
// Data point building
// ---------------------------------------------------------------------------

/** Build per-date data points with averaged scores rounded to 1 decimal. */
export function buildDataPoints(
  sortedDates: string[],
  dateMetricMap: DateMetricMap,
): TrendDataPoint[] {
  return sortedDates.map((date) => {
    const metricMap = dateMetricMap.get(date);
    const scores: Record<string, number> = {};

    if (metricMap) {
      for (const [key, values] of metricMap) {
        scores[key] = round1(mean(values));
      }
    }

    return { date, scores };
  });
}

// ---------------------------------------------------------------------------
// Pillar trend building
// ---------------------------------------------------------------------------

/** Compute pillar-level trend data points for a single pillar. */
function buildPillarDataPoints(
  pillarKey: PillarKey,
  sortedDates: string[],
  dateMetricMap: DateMetricMap,
): Array<{ date: string; averageScore: number }> {
  const config = PILLAR_CONFIG[pillarKey];

  return sortedDates
    .map((date) => {
      const metricMap = dateMetricMap.get(date);
      if (!metricMap) return null;

      const constituentScores: number[] = [];
      for (const mk of config.metricKeys) {
        const values = metricMap.get(mk);
        if (values && values.length > 0) {
          constituentScores.push(mean(values));
        }
      }

      if (constituentScores.length === 0) return null;
      return { date, averageScore: round1(mean(constituentScores)) };
    })
    .filter((dp): dp is { date: string; averageScore: number } => dp !== null);
}

/** Compute delta percent between the first and last data point. Returns null when unavailable. */
function computeDeltaPercent(
  dataPoints: Array<{ date: string; averageScore: number }>,
): number | null {
  if (dataPoints.length < 2) return null;
  const first = dataPoints[0];
  const last = dataPoints[dataPoints.length - 1];
  if (!first || !last || first.averageScore === 0) return null;
  return round1(((last.averageScore - first.averageScore) / first.averageScore) * 100);
}

/** Build pillar trend entries for all configured pillars. */
export function buildPillarTrends(
  sortedDates: string[],
  dateMetricMap: DateMetricMap,
): PillarTrend[] {
  return PILLAR_KEYS.map((pillarKey: PillarKey) => {
    const config = PILLAR_CONFIG[pillarKey];
    const dataPoints = buildPillarDataPoints(pillarKey, sortedDates, dateMetricMap);
    const deltaPercent = computeDeltaPercent(dataPoints);

    return {
      pillarKey,
      label: config.label,
      color: config.color,
      dataPoints,
      deltaPercent,
    };
  });
}
