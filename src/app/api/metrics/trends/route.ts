// Metrics trends API — returns time-series metric data grouped by date with pillar aggregations
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { auth } from '@/features/auth/auth';
import { prisma } from '@/lib/prisma';
import { PILLAR_CONFIG, PILLAR_KEYS } from '@/features/dashboard/pillars';
import type { PillarKey } from '@/features/dashboard/pillars';
import { z } from 'zod';
import {
  RangeSchema,
  TrendsResponseSchema,
  type TrendDataPoint,
  type PillarTrend,
} from '@/lib/schemas/trends';

type Range = '7d' | '30d' | '90d' | 'all';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Resolve a time range to a UTC cutoff date. */
function resolveCutoff(range: Range): Date {
  if (range === 'all') return new Date(0);

  const now = new Date();
  const days = parseInt(range, 10); // '7d' → 7, '30d' → 30, '90d' → 90
  now.setUTCDate(now.getUTCDate() - days);
  return now;
}

/** Format a Date to 'YYYY-MM-DD' in UTC. */
function toDateString(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** Round a number to one decimal place. */
function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

/** Compute mean of a non-empty number array. */
function mean(values: readonly number[]): number {
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

// ---------------------------------------------------------------------------
// GET handler
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  const session = await auth();

  if (!session?.user?.externalId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { externalId: session.user.externalId },
    select: { id: true },
  });

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Parse range — default to '30d' on invalid/missing values
  const rawRange = request.nextUrl.searchParams.get('range');
  const rangeResult = RangeSchema.safeParse(rawRange);
  const range: Range = rangeResult.success ? rangeResult.data : '30d';

  const cutoff = resolveCutoff(range);

  // Fetch metric snapshots within the time range
  const snapshots = await prisma.metricSnapshot.findMany({
    where: {
      session: {
        userId: user.id,
        createdAt: { gte: cutoff },
      },
    },
    select: {
      key: true,
      score: true,
      session: { select: { createdAt: true } },
    },
    orderBy: { session: { createdAt: 'asc' } },
  });

  // Group scores by date → metric key → score[]
  const dateMetricMap = new Map<string, Map<string, number[]>>();
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

  // Build data points — average scores per date per metric, rounded to 1 decimal
  const sortedDates = [...dateMetricMap.keys()].sort();
  const dataPoints: TrendDataPoint[] = sortedDates.map((date) => {
    const metricMap = dateMetricMap.get(date);
    const scores: Record<string, number> = {};

    if (metricMap) {
      for (const [key, values] of metricMap) {
        scores[key] = round1(mean(values));
      }
    }

    return { date, scores };
  });

  // Build pillar trends
  const pillarTrends: PillarTrend[] = PILLAR_KEYS.map((pillarKey: PillarKey) => {
    const config = PILLAR_CONFIG[pillarKey];

    // Compute per-date average across constituent metrics
    const pillarDataPoints = sortedDates
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

        return {
          date,
          averageScore: round1(mean(constituentScores)),
        };
      })
      .filter(
        (dp): dp is { date: string; averageScore: number } => dp !== null,
      );

    // Compute delta percent between first and last data point
    let deltaPercent: number | null = null;
    if (pillarDataPoints.length >= 2) {
      const first = pillarDataPoints[0];
      const last = pillarDataPoints[pillarDataPoints.length - 1];
      if (first && last && first.averageScore !== 0) {
        deltaPercent = round1(((last.averageScore - first.averageScore) / first.averageScore) * 100);
      }
    }

    return {
      pillarKey,
      label: config.label,
      color: config.color,
      dataPoints: pillarDataPoints,
      deltaPercent,
    };
  });

  // Count unique sessions (by unique dates as a proxy — each date represents at least one session)
  const sessionCount = sessionDates.size;

  // Validate response before returning
  const payload = {
    range,
    dataPoints,
    pillarTrends,
    sessionCount,
  };

  try {
    const validated = TrendsResponseSchema.parse(payload);
    return NextResponse.json(validated);
  } catch (err: unknown) {
    const message =
      err instanceof z.ZodError
        ? err.issues.map((issue: z.ZodIssue) => issue.message).join(', ')
        : 'Internal validation error';
    return NextResponse.json(
      { error: 'Response validation failed', details: message },
      { status: 500 },
    );
  }
}
