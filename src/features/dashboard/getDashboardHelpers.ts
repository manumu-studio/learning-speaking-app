// Helper functions for dashboard data: streak, trend, workout weeks, and personal records
import { prisma } from '@/lib/prisma';
import type { PersonalRecord } from '@/lib/personalRecords.types';
import type { MetricKey, TrendDirection } from './dashboard.types';

/** Count calendar weeks where the user completed at least three workouts. */
export function computeWorkoutWeeks(sessionDates: Date[]): number {
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
export function getISOWeekKey(date: Date): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayOfWeek = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayOfWeek);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNumber = Math.ceil(((d.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNumber).padStart(2, '0')}`;
}

/** Count consecutive days with sessions, starting from today backward */
export function computeStreak(dates: Date[]): number {
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
export function computeTrend(history: number[]): TrendDirection {
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

/** Fetch all-time personal records for each metric key for a given user. */
export async function fetchAllTimePersonalRecords(
  userId: string,
  metricLabels: Record<MetricKey, string>,
  isMetricKey: (key: string) => key is MetricKey,
): Promise<PersonalRecord[]> {
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
      metricLabel: metricLabels[key],
      score: maxScore,
      timeframe: 'all-time',
      previousBest: null,
      sessionDate: bestSnapshot.createdAt.toISOString(),
    });
  }

  return allTimePRs;
}
