// Aggregates a day's sessions into pillar scores, total duration, and intent labels

import { PILLAR_CONFIG, PILLAR_KEYS } from '@/lib/metrics/pillars';

export interface DaySessionData {
  sessionId: string;
  durationSecs: number | null;
  intentLabel: string | null;
  metrics: Array<{ key: string; score: number }>;
}

export interface AggregatedDayData {
  sessionCount: number;
  totalDurationSecs: number;
  pillarScores: { delivery: number; language: number; pronunciation: number };
  intentLabels: string[];
  perMetricAverages: Array<{ key: string; average: number }>;
}

function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

export function aggregateDayData(sessions: DaySessionData[]): AggregatedDayData {
  if (sessions.length === 0) {
    return {
      sessionCount: 0,
      totalDurationSecs: 0,
      pillarScores: { delivery: 0, language: 0, pronunciation: 0 },
      intentLabels: [],
      perMetricAverages: [],
    };
  }

  // Accumulate metric scores by key across all sessions
  const metricAccumulator = new Map<string, number[]>();
  for (const session of sessions) {
    for (const { key, score } of session.metrics) {
      const existing = metricAccumulator.get(key);
      if (existing !== undefined) {
        existing.push(score);
      } else {
        metricAccumulator.set(key, [score]);
      }
    }
  }

  // Build per-metric averages
  const perMetricAverages: Array<{ key: string; average: number }> = [];
  for (const [key, scores] of metricAccumulator) {
    perMetricAverages.push({ key, average: mean(scores) });
  }

  // Build a lookup for fast pillar score computation
  const metricAverageByKey = new Map<string, number>(
    perMetricAverages.map(({ key, average }) => [key, average]),
  );

  // Compute pillar scores from constituent metric averages
  const pillarScores = { delivery: 0, language: 0, pronunciation: 0 };
  for (const pillarKey of PILLAR_KEYS) {
    const keys = PILLAR_CONFIG[pillarKey].metricKeys as readonly string[];
    const values = keys
      .map((k) => metricAverageByKey.get(k))
      .filter((v): v is number => v !== undefined);
    pillarScores[pillarKey] = mean(values);
  }

  // Total duration (null treated as 0)
  const totalDurationSecs = sessions.reduce(
    (sum, s) => sum + (s.durationSecs ?? 0),
    0,
  );

  // Collect non-null intent labels
  const intentLabels = sessions
    .map((s) => s.intentLabel)
    .filter((label): label is string => label !== null);

  return {
    sessionCount: sessions.length,
    totalDurationSecs,
    pillarScores,
    intentLabels,
    perMetricAverages,
  };
}
