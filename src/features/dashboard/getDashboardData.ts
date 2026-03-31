// Dashboard data aggregation — computes stats, streaks, and metric trends
import { prisma } from '@/lib/prisma';
import type { DashboardData, DashboardMetric, MetricKey, MetricLevel, TrendDirection } from './dashboard.types';

const METRIC_KEYS: MetricKey[] = [
  'connectorRepetition',
  'structuralVariety',
  'vocabularyPrecision',
  'verbAccuracy',
  'argumentClosure',
  'fillerUsage',
];

const METRIC_LABELS: Record<MetricKey, string> = {
  connectorRepetition: 'Connector Repetition',
  structuralVariety: 'Structural Variety',
  vocabularyPrecision: 'Vocabulary Precision',
  verbAccuracy: 'Verb Accuracy',
  argumentClosure: 'Argument Closure',
  fillerUsage: 'Filler Usage',
};

export async function getDashboardData(userId: string): Promise<DashboardData> {
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  // Weekly stats — sessions from last 7 days
  const weeklySessions = await prisma.speakingSession.findMany({
    where: {
      userId,
      createdAt: { gte: weekAgo },
      status: 'DONE',
    },
    select: {
      durationSecs: true,
    },
  });

  const weeklyMinutes = Math.round(
    weeklySessions.reduce((sum, s) => sum + (s.durationSecs ?? 0), 0) / 60
  );
  const weeklySessionCount = weeklySessions.length;

  // Total sessions
  const totalSessions = await prisma.speakingSession.count({
    where: { userId, status: 'DONE' },
  });

  // Streak — count consecutive days with at least one session
  const allSessions = await prisma.speakingSession.findMany({
    where: { userId, status: 'DONE' },
    orderBy: { createdAt: 'desc' },
    select: { createdAt: true },
  });

  const currentStreak = computeStreak(allSessions.map((s) => s.createdAt));

  // Query today's focus session to determine which metric was trained today
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const todayFocusSession = await prisma.speakingSession.findFirst({
    where: {
      userId,
      focusMetricKey: { not: null },
      createdAt: { gte: todayStart },
      status: 'DONE',
    },
    orderBy: { createdAt: 'desc' },
    select: { focusMetricKey: true },
  });

  // Metrics — last 7 snapshots per key, compute trend
  const metrics: DashboardMetric[] = await Promise.all(
    METRIC_KEYS.map(async (key) => {
      const snapshots = await prisma.metricSnapshot.findMany({
        where: {
          session: { userId },
          key,
        },
        orderBy: { createdAt: 'desc' },
        take: 7,
        select: {
          score: true,
          level: true,
        },
      });

      const history = snapshots.map((s) => s.score).reverse();
      const currentScore = history[history.length - 1] ?? 0;
      const currentLevel = (snapshots[0]?.level ?? 'medium') as MetricLevel;
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
    })
  );

  // Recent sessions — last 5
  const recentSessions = await prisma.speakingSession.findMany({
    where: { userId, status: 'DONE' },
    orderBy: { createdAt: 'desc' },
    take: 5,
    select: {
      id: true,
      createdAt: true,
      intentLabel: true,
      focusNext: true,
    },
  });

  return {
    weeklyMinutes,
    weeklySessionCount,
    totalSessions,
    currentStreak,
    currentFocus: null,
    metrics,
    recentSessions,
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
