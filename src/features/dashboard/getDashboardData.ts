// Dashboard data aggregation — computes stats, streaks, and metric trends with caching
import { unstable_cache } from 'next/cache';
import { prisma } from '@/lib/prisma';
import type { DashboardData, DashboardMetric, MetricKey, MetricLevel, TrendDirection } from './dashboard.types';

const METRIC_KEYS: MetricKey[] = [
  'connectorRepetition',
  'structuralVariety',
  'vocabularyPrecision',
  'verbAccuracy',
  'argumentClosure',
  'fillerUsage',
  'pronunciationAccuracy',
  'prosodyScore',
  'speakingRate',
];

const METRIC_KEY_SET = new Set<string>(METRIC_KEYS);
function isMetricKey(key: string): key is MetricKey {
  return METRIC_KEY_SET.has(key);
}

const METRIC_LABELS: Record<MetricKey, string> = {
  connectorRepetition: 'Connector Repetition',
  structuralVariety: 'Structural Variety',
  vocabularyPrecision: 'Vocabulary Precision',
  verbAccuracy: 'Verb Accuracy',
  argumentClosure: 'Argument Closure',
  fillerUsage: 'Filler Usage',
  pronunciationAccuracy: 'Pronunciation Accuracy',
  prosodyScore: 'Prosody & Rhythm',
  speakingRate: 'Speaking Rate',
};

/**
 * Loads and derives dashboard metrics for one user: weekly totals, streak, per-metric trends/history,
 * recent sessions, and drill aggregates. Call only after auth has resolved `userId`.
 * Cached for 60s per user via unstable_cache to reduce database load.
 */
export const getDashboardData = (userId: string): Promise<DashboardData> =>
  unstable_cache(
    async (): Promise<DashboardData> => fetchDashboardData(userId),
    ['dashboard', userId],
    { revalidate: 60, tags: ['dashboard'] },
  )();

async function fetchDashboardData(userId: string): Promise<DashboardData> {
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  // Parallelize all independent session queries
  const [weeklySessions, totalSessions, allSessions, todayFocusSession, allSnapshots, recentSessions, drillTotal, drillWeekly, drillImproved, drillByMetric] = await Promise.all([
    // Weekly stats
    prisma.speakingSession.findMany({
      where: { userId, createdAt: { gte: weekAgo }, status: 'DONE' },
      select: { durationSecs: true },
    }),
    // Total count
    prisma.speakingSession.count({
      where: { userId, status: 'DONE' },
    }),
    // Streak data
    prisma.speakingSession.findMany({
      where: { userId, status: 'DONE' },
      orderBy: { createdAt: 'desc' },
      take: 100,
      select: { createdAt: true },
    }),
    // Today's focus session
    prisma.speakingSession.findFirst({
      where: { userId, focusMetricKey: { not: null }, createdAt: { gte: todayStart }, status: 'DONE' },
      orderBy: { createdAt: 'desc' },
      select: { focusMetricKey: true },
    }),
    // All metric snapshots in a single query (consolidated from 6 → 1)
    prisma.metricSnapshot.findMany({
      where: { session: { userId }, key: { in: [...METRIC_KEYS] } },
      orderBy: { createdAt: 'desc' },
      select: { key: true, score: true, level: true },
    }),
    // Recent sessions
    prisma.speakingSession.findMany({
      where: { userId, status: 'DONE' },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: { id: true, createdAt: true, intentLabel: true, focusNext: true },
    }),
    // Drill stats (4 queries, already parallelized)
    prisma.drillAttempt.count({
      where: { userId, completedAt: { not: null } },
    }),
    prisma.drillAttempt.count({
      where: { userId, completedAt: { not: null, gte: weekAgo } },
    }),
    prisma.drillAttempt.count({
      where: { userId, completedAt: { not: null }, improved: true },
    }),
    prisma.drillAttempt.groupBy({
      by: ['metricKey'],
      where: { userId, completedAt: { not: null } },
      _count: { _all: true },
    }),
  ]);

  const weeklyMinutes = Math.round(
    weeklySessions.reduce((sum, s) => sum + (s.durationSecs ?? 0), 0) / 60
  );
  const weeklySessionCount = weeklySessions.length;
  const currentStreak = computeStreak(allSessions.map((s) => s.createdAt));

  // Group snapshots by key client-side (single query instead of 6)
  const snapshotsByKey = new Map<MetricKey, Array<{ score: number; level: string }>>();
  for (const key of METRIC_KEYS) {
    snapshotsByKey.set(key, []);
  }
  for (const snap of allSnapshots) {
    if (!isMetricKey(snap.key)) continue;
    const bucket = snapshotsByKey.get(snap.key);
    if (bucket && bucket.length < 7) {
      bucket.push(snap);
    }
  }

  // Build metrics from grouped snapshots
  const metrics: DashboardMetric[] = METRIC_KEYS.map((key) => {
    const snapshots = snapshotsByKey.get(key) ?? [];
    const history = snapshots.map((s) => s.score).reverse();
    const currentScore = history[history.length - 1] ?? 0;
    const rawLevel = snapshots[0]?.level ?? 'medium';
    const currentLevel: MetricLevel = rawLevel === 'low' || rawLevel === 'medium' || rawLevel === 'high' ? rawLevel : 'medium';
    const trend = computeTrend(history);

    return {
      key,
      label: METRIC_LABELS[key],
      currentLevel,
      currentScore,
      trend,
      history,
      lastTrainedToday: todayFocusSession?.focusMetricKey === key,
    };
  });

  const improvementRate =
    drillTotal > 0 ? (drillImproved / drillTotal) * 100 : 0;

  const byMetric: Record<MetricKey, number> = {
    connectorRepetition: 0,
    structuralVariety: 0,
    vocabularyPrecision: 0,
    verbAccuracy: 0,
    argumentClosure: 0,
    fillerUsage: 0,
    pronunciationAccuracy: 0,
    prosodyScore: 0,
    speakingRate: 0,
  };

  for (const row of drillByMetric) {
    const key = row.metricKey;
    if (isMetricKey(key)) {
      byMetric[key] = row._count._all;
    }
  }

  const drillStats = {
    totalCompleted: drillTotal,
    weeklyCompleted: drillWeekly,
    improvementRate,
    byMetric,
  };

  return {
    weeklyMinutes,
    weeklySessionCount,
    totalSessions,
    currentStreak,
    currentFocus: null,
    metrics,
    recentSessions,
    drillStats,
  };
}

/** Count consecutive days with sessions, starting from today backward */
function computeStreak(dates: Date[]): number {
  if (dates.length === 0) return 0;

  const uniqueDays = new Set(dates.map((d) => d.toDateString()));
  const today = new Date();
  let streak = 0;
  const checkDate = new Date(today);

  while (uniqueDays.has(checkDate.toDateString())) {
    streak++;
    checkDate.setDate(checkDate.getDate() - 1);
  }

  return streak;
}

/** Compute trend: avg of last 3 vs prev scores, >10% diff = improving/declining */
function computeTrend(history: number[]): TrendDirection {
  if (history.length < 4) return 'stable';

  const recent = history.slice(-3);
  const previous = history.slice(0, -3);

  const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
  const prevAvg = previous.reduce((a, b) => a + b, 0) / previous.length;

  if (prevAvg === 0) return 'stable';

  const change = (recentAvg - prevAvg) / prevAvg;

  if (change > 0.1) return 'improving';
  if (change < -0.1) return 'declining';
  return 'stable';
}
