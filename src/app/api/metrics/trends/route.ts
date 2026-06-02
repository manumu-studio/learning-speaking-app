// Metrics trends API — returns time-series metric data grouped by date with pillar aggregations
import { NextResponse } from 'next/server';
import { auth } from '@/features/auth/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { RangeSchema, TrendsResponseSchema } from '@/lib/schemas/trends';
import { withObservability } from '@/lib/observability';
import { groupSnapshotsByDate, buildDataPoints, buildPillarTrends } from './trendsQuery';

type Range = '7d' | '30d' | '90d' | 'all';

/** Resolve a time range to a UTC cutoff date. */
function resolveCutoff(range: Range): Date {
  if (range === 'all') return new Date(0);
  const now = new Date();
  const days = parseInt(range, 10);
  now.setUTCDate(now.getUTCDate() - days);
  return now;
}

async function handler(request: Request) {
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

  const url = new URL(request.url);
  const rangeResult = RangeSchema.safeParse(url.searchParams.get('range'));
  const range: Range = rangeResult.success ? rangeResult.data : '30d';
  const cutoff = resolveCutoff(range);

  const snapshots = await prisma.metricSnapshot.findMany({
    where: { session: { userId: user.id, createdAt: { gte: cutoff } } },
    select: {
      key: true,
      score: true,
      session: { select: { createdAt: true } },
    },
    orderBy: { session: { createdAt: 'asc' } },
  });

  const { dateMetricMap, sessionDates } = groupSnapshotsByDate(snapshots);
  const sortedDates = [...dateMetricMap.keys()].sort();
  const dataPoints = buildDataPoints(sortedDates, dateMetricMap);
  const pillarTrends = buildPillarTrends(sortedDates, dateMetricMap);

  const payload = {
    range,
    dataPoints,
    pillarTrends,
    sessionCount: sessionDates.size,
  };

  try {
    const validated = TrendsResponseSchema.parse(payload);
    return NextResponse.json(validated, {
      headers: {
        'Cache-Control': 'private, max-age=30, stale-while-revalidate=60',
      },
    });
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

export const GET = withObservability(handler, { route: 'metrics/trends' });
