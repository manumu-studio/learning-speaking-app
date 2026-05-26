// Tests for dashboard data aggregation — streaks, trends, and zero states
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prismaMock } from '@/__mocks__/prisma';

// Mock unstable_cache as a passthrough — no Next.js incremental cache in test env
vi.mock('next/cache', () => ({
  unstable_cache: (fn: (...args: unknown[]) => unknown) => fn,
}));

import { getDashboardData } from './getDashboardData';

vi.mock('@/lib/prisma', () => ({ prisma: prismaMock }));

/** Deep mock typing omits vitest helpers on `groupBy`; cast for test stubs only */
const mockDrillGroupBy = prismaMock.drillAttempt.groupBy as unknown as {
  mockResolvedValue: (value: unknown) => void;
};

beforeEach(() => {
  vi.clearAllMocks();
});

function mockEmptyState() {
  prismaMock.speakingSession.findMany.mockResolvedValue([] as never);
  prismaMock.speakingSession.count.mockResolvedValue(0);
  prismaMock.speakingSession.findFirst.mockResolvedValue(null);
  prismaMock.metricSnapshot.findMany.mockResolvedValue([] as never);
  prismaMock.drillAttempt.count.mockResolvedValue(0);
  mockDrillGroupBy.mockResolvedValue([] as never);
}

function stubSequentialFindMany(weekly: unknown, streak: unknown, recent: unknown) {
  prismaMock.speakingSession.findMany
    .mockResolvedValueOnce(weekly as never)
    .mockResolvedValueOnce(streak as never)
    .mockResolvedValueOnce(recent as never);
}

describe('getDashboardData', () => {
  it('returns zero state when user has no sessions', async () => {
    mockEmptyState();

    const result = await getDashboardData('user-1');

    expect(result.weeklyMinutes).toBe(0);
    expect(result.weeklySessionCount).toBe(0);
    expect(result.totalSessions).toBe(0);
    expect(result.currentStreak).toBe(0);
    expect(result.metrics).toHaveLength(9);
    expect(result.metrics.every((m) => m.currentScore === 0)).toBe(true);
  });

  it('computes streak of 3 for sessions on 3 consecutive days', async () => {
    const today = new Date();
    today.setHours(12, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    const twoDaysAgo = new Date(today);
    twoDaysAgo.setDate(today.getDate() - 2);

    prismaMock.speakingSession.count.mockResolvedValue(3);
    stubSequentialFindMany(
      [],
      [{ createdAt: today }, { createdAt: yesterday }, { createdAt: twoDaysAgo }],
      []
    );
    prismaMock.speakingSession.findFirst.mockResolvedValue(null);
    prismaMock.metricSnapshot.findMany.mockResolvedValue([] as never);
    prismaMock.drillAttempt.count.mockResolvedValue(0);
    mockDrillGroupBy.mockResolvedValue([] as never);

    const result = await getDashboardData('user-1');
    expect(result.currentStreak).toBe(3);
  });

  it('resets streak when there is a gap in session days', async () => {
    const today = new Date();
    today.setHours(12, 0, 0, 0);
    const threeDaysAgo = new Date(today);
    threeDaysAgo.setDate(today.getDate() - 3);

    prismaMock.speakingSession.count.mockResolvedValue(2);
    stubSequentialFindMany([], [{ createdAt: today }, { createdAt: threeDaysAgo }], []);
    prismaMock.speakingSession.findFirst.mockResolvedValue(null);
    prismaMock.metricSnapshot.findMany.mockResolvedValue([] as never);
    prismaMock.drillAttempt.count.mockResolvedValue(0);
    mockDrillGroupBy.mockResolvedValue([] as never);

    const result = await getDashboardData('user-1');
    expect(result.currentStreak).toBe(1);
  });

  it('counts multiple same-day sessions as streak of 1', async () => {
    const today = new Date();
    today.setHours(10, 0, 0, 0);
    const today2 = new Date(today);
    today2.setHours(14, 0, 0, 0);
    const today3 = new Date(today);
    today3.setHours(18, 0, 0, 0);

    prismaMock.speakingSession.count.mockResolvedValue(3);
    stubSequentialFindMany([], [{ createdAt: today }, { createdAt: today2 }, { createdAt: today3 }], []);
    prismaMock.speakingSession.findFirst.mockResolvedValue(null);
    prismaMock.metricSnapshot.findMany.mockResolvedValue([] as never);
    prismaMock.drillAttempt.count.mockResolvedValue(0);
    mockDrillGroupBy.mockResolvedValue([] as never);

    const result = await getDashboardData('user-1');
    expect(result.currentStreak).toBe(1);
  });

  it('computes improving trend when recent scores are significantly higher', async () => {
    prismaMock.speakingSession.findMany.mockResolvedValue([] as never);
    prismaMock.speakingSession.count.mockResolvedValue(0);
    prismaMock.speakingSession.findFirst.mockResolvedValue(null);
    // Single consolidated query returns all snapshots — scores desc for connectorRepetition
    const scoresDesc = [9, 8, 7, 3, 3, 3, 3];
    prismaMock.metricSnapshot.findMany.mockResolvedValue(
      scoresDesc.map((score) => ({ key: 'connectorRepetition', score, level: 'medium' })) as never,
    );
    prismaMock.drillAttempt.count.mockResolvedValue(0);
    mockDrillGroupBy.mockResolvedValue([] as never);

    const result = await getDashboardData('user-1');
    const connector = result.metrics.find((m) => m.key === 'connectorRepetition');
    expect(connector?.trend).toBe('improving');
  });

  it('aggregates drill statistics correctly', async () => {
    prismaMock.speakingSession.findMany.mockResolvedValue([] as never);
    prismaMock.speakingSession.count.mockResolvedValue(0);
    prismaMock.speakingSession.findFirst.mockResolvedValue(null);
    prismaMock.metricSnapshot.findMany.mockResolvedValue([] as never);
    (
      prismaMock.drillAttempt.count as unknown as {
        mockImplementation: (fn: (args: { where?: Record<string, unknown> } | undefined) => Promise<number>) => void;
      }
    ).mockImplementation((args) => {
      const w = args?.where;
      if (!w) return Promise.resolve(0);
      if (w.improved === true) return Promise.resolve(7);
      const completedAt = w.completedAt as { gte?: Date; not: unknown } | undefined;
      if (completedAt && 'gte' in completedAt && completedAt.gte) return Promise.resolve(3);
      return Promise.resolve(10);
    });
    mockDrillGroupBy.mockResolvedValue([
      { metricKey: 'connectorRepetition', _count: { _all: 4 } },
      { metricKey: 'fillerUsage', _count: { _all: 6 } },
    ] as never);

    const result = await getDashboardData('user-1');

    expect(result.drillStats.totalCompleted).toBe(10);
    expect(result.drillStats.weeklyCompleted).toBe(3);
    expect(result.drillStats.improvementRate).toBe(70);
    expect(result.drillStats.byMetric.connectorRepetition).toBe(4);
    expect(result.drillStats.byMetric.fillerUsage).toBe(6);
  });
});
