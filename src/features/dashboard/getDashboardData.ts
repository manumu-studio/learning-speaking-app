// Dashboard data aggregation — computes stats, streaks, and metric trends with caching
import { unstable_cache } from 'next/cache';
import { prisma } from '@/lib/prisma';
import type { PersonalRecord } from '@/lib/personalRecords.types';
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

/** Downsample voiced F0 frames into a normalized sparkline series */
function downsamplePitchPreview(f0Hz: number[], targetPoints = 24): number[] {
  const voiced = f0Hz.filter((value) => value > 0);
  if (voiced.length < 2) {
    return [];
  }

  const min = Math.min(...voiced);
  const max = Math.max(...voiced);
  const range = max - min || 1;
  const normalized = voiced.map((value) => (value - min) / range);
  const step = Math.max(1, Math.floor(normalized.length / targetPoints));

  return normalized.filter((_, index) => index % step === 0).slice(0, targetPoints);
}

async function fetchRecentProsodyPitchPreview(userId: string): Promise<number[]> {
  const latestFeature = await prisma.chunkFeature.findFirst({
    where: { session: { userId, isOnboarding: false } },
    orderBy: { createdAt: 'desc' },
    select: { f0Hz: true },
  });

  if (!latestFeature) {
    return [];
  }

  return downsamplePitchPreview(latestFeature.f0Hz);
}

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
      where: { userId, createdAt: { gte: weekAgo }, status: 'DONE', isOnboarding: false },
      select: { durationSecs: true },
    }),
    // Total count
    prisma.speakingSession.count({
      where: { userId, status: 'DONE', isOnboarding: false },
    }),
    // Streak data
    prisma.speakingSession.findMany({
      where: { userId, status: 'DONE', isOnboarding: false },
      orderBy: { createdAt: 'desc' },
      take: 100,
      select: { createdAt: true },
    }),
    // Today's focus session
    prisma.speakingSession.findFirst({
      where: {
        userId,
        isOnboarding: false,
        focusMetricKey: { not: null },
        createdAt: { gte: todayStart },
        status: 'DONE',
      },
      orderBy: { createdAt: 'desc' },
      select: { focusMetricKey: true },
    }),
    // All metric snapshots in a single query (consolidated from 6 → 1)
    prisma.metricSnapshot.findMany({
      where: { session: { userId, isOnboarding: false }, key: { in: [...METRIC_KEYS] } },
      orderBy: { createdAt: 'desc' },
      select: { key: true, score: true, level: true },
    }),
    // Recent sessions
    prisma.speakingSession.findMany({
      where: { userId, status: 'DONE', isOnboarding: false },
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
  const workoutWeeks = computeWorkoutWeeks(allSessions.map((s) => s.createdAt));
  const [personalRecords, recentProsodyPitchPreview] = await Promise.all([
    fetchAllTimePersonalRecords(userId),
    fetchRecentProsodyPitchPreview(userId),
  ]);

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
    workoutWeeks,
    currentFocus: null,
    metrics,
    recentSessions,
    drillStats,
    personalRecords,
    totalWorkoutCount: totalSessions,
    recentProsodyPitchPreview,
  };
}

/** Count calendar weeks where the user completed at least three workouts. */
function computeWorkoutWeeks(sessionDates: Date[]): number {
  const weekCounts = new Map<string, number>();

  for (const date of sessionDates) {
    const weekKey = getISOWeekKey(date);
    weekCounts.set(weekKey, (weekCounts.get(weekKey) ?? 0) + 1);
  }

  let count = 0;
  for (const sessionCount of weekCounts.values()) {
    if (sessionCount >= 3) {
      count++;
    }
  }
  return count;
}

/** Returns ISO week key like "2026-W21" for grouping. */
function getISOWeekKey(date: Date): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayOfWeek = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayOfWeek);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNumber = Math.ceil(((d.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNumber).padStart(2, '0')}`;
}

async function fetchAllTimePersonalRecords(userId: string): Promise<PersonalRecord[]> {
  const allTimeBestRows = await prisma.metricSnapshot.groupBy({
    by: ['key'],
    where: { session: { userId, isOnboarding: false } },
    _max: { score: true },
  });

  const allTimePRs: PersonalRecord[] = [];

  for (const row of allTimeBestRows) {
    const key = row.key;
    if (!isMetricKey(key)) {
      continue;
    }

    const maxScore = row._max.score;
    if (maxScore === null) {
      continue;
    }

    const bestSnapshot = await prisma.metricSnapshot.findFirst({
      where: { session: { userId, isOnboarding: false }, key, score: maxScore },
      orderBy: { createdAt: 'asc' },
      select: { createdAt: true },
    });

    if (!bestSnapshot) {
      continue;
    }

    allTimePRs.push({
      metricKey: key,
      metricLabel: METRIC_LABELS[key],
      score: maxScore,
      timeframe: 'all-time',
      previousBest: null,
      sessionDate: bestSnapshot.createdAt.toISOString(),
    });
  }

  return allTimePRs;
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
