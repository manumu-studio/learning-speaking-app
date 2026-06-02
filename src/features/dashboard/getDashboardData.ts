// Dashboard data aggregation — computes stats, streaks, and metric trends with caching
import { unstable_cache } from 'next/cache';
import { prisma } from '@/lib/prisma';
import type { DashboardData, MetricKey } from './dashboard.types';
import { estimateCefr } from '@/lib/cefr/estimateCefr';
import {
  computeWorkoutWeeks,
  computeStreak,
  fetchAllTimePersonalRecords,
} from '@/features/dashboard/getDashboardHelpers';
import {
  groupSnapshotsByKey,
  buildMetricsFromSnapshots,
  buildDrillByMetricCounts,
} from './getDashboardData.build';

const METRIC_KEYS: MetricKey[] = [
  'connectorRepetition',
  'structuralVariety',
  'vocabularyPrecision',
  'verbAccuracy',
  'argumentClosure',
  'fillerUsage',
  'lexicalSophistication',
  'registerPragmatics',
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
  lexicalSophistication: 'Lexical Sophistication',
  registerPragmatics: 'Register & Pragmatics',
  pronunciationAccuracy: 'Pronunciation Accuracy',
  prosodyScore: 'Prosody & Rhythm',
  speakingRate: 'Speaking Rate',
};

/** Downsample voiced F0 frames into a normalized sparkline series */
function downsamplePitchPreview(f0Hz: number[], targetPoints = 24): number[] {
  const voiced = f0Hz.filter((value) => value > 0);
  if (voiced.length < 2) return [];
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
  if (!latestFeature) return [];
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

  const [
    weeklySessions, totalSessions, allSessions, todayFocusSession,
    allSnapshots, recentSessions, drillTotal, drillWeekly, drillImproved, drillByMetric,
  ] = await fetchParallelQueries(userId, weekAgo, todayStart);

  const weeklyMinutes = Math.round(
    weeklySessions.reduce((sum, s) => sum + (s.durationSecs ?? 0), 0) / 60,
  );
  const currentStreak = computeStreak(allSessions.map((s) => s.createdAt));
  const workoutWeeks = computeWorkoutWeeks(allSessions.map((s) => s.createdAt));

  const [personalRecords, recentProsodyPitchPreview] = await Promise.all([
    fetchAllTimePersonalRecords(userId, METRIC_LABELS, isMetricKey),
    fetchRecentProsodyPitchPreview(userId),
  ]);

  const snapshotsByKey = groupSnapshotsByKey(allSnapshots, METRIC_KEYS, isMetricKey);
  const metrics = buildMetricsFromSnapshots(METRIC_KEYS, METRIC_LABELS, snapshotsByKey, todayFocusSession);
  const byMetric = buildDrillByMetricCounts(drillByMetric, isMetricKey);
  const improvementRate = drillTotal > 0 ? (drillImproved / drillTotal) * 100 : 0;
  const drillStats = { totalCompleted: drillTotal, weeklyCompleted: drillWeekly, improvementRate, byMetric };
  const cefrEstimate = estimateCefr(metrics.filter((m) => m.currentScore > 0).map((m) => ({ key: m.key, score: m.currentScore })));
  const radarScores = metrics.map((m) => ({ key: m.key, label: METRIC_LABELS[m.key] ?? m.key, score: m.currentScore, c2Threshold: 8.0 }));

  return {
    weeklyMinutes,
    weeklySessionCount: weeklySessions.length,
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
    cefrEstimate,
    radarScores,
  };
}

/** Fires all independent Prisma queries in parallel and returns typed results. */
async function fetchParallelQueries(userId: string, weekAgo: Date, todayStart: Date) {
  return Promise.all([
    prisma.speakingSession.findMany({
      where: { userId, createdAt: { gte: weekAgo }, status: 'DONE', isOnboarding: false },
      select: { durationSecs: true },
    }),
    prisma.speakingSession.count({ where: { userId, status: 'DONE', isOnboarding: false } }),
    prisma.speakingSession.findMany({
      where: { userId, status: 'DONE', isOnboarding: false },
      orderBy: { createdAt: 'desc' },
      take: 100,
      select: { createdAt: true },
    }),
    prisma.speakingSession.findFirst({
      where: { userId, isOnboarding: false, focusMetricKey: { not: null }, createdAt: { gte: todayStart }, status: 'DONE' },
      orderBy: { createdAt: 'desc' },
      select: { focusMetricKey: true },
    }),
    prisma.metricSnapshot.findMany({
      where: { session: { userId, isOnboarding: false }, key: { in: [...METRIC_KEYS] } },
      orderBy: { createdAt: 'desc' },
      select: { key: true, score: true, level: true },
    }),
    prisma.speakingSession.findMany({
      where: { userId, status: 'DONE', isOnboarding: false },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: { id: true, createdAt: true, intentLabel: true, focusNext: true },
    }),
    prisma.drillAttempt.count({ where: { userId, completedAt: { not: null } } }),
    prisma.drillAttempt.count({ where: { userId, completedAt: { not: null, gte: weekAgo } } }),
    prisma.drillAttempt.count({ where: { userId, completedAt: { not: null }, improved: true } }),
    prisma.drillAttempt.groupBy({
      by: ['metricKey'],
      where: { userId, completedAt: { not: null } },
      _count: { _all: true },
    }),
  ] as const);
}
