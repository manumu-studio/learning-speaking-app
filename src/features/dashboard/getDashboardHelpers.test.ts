// Tests for dashboard helper functions — streak, trend, workout weeks, and personal records
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { prismaMock } from '@/__mocks__/prisma';

vi.mock('@/lib/prisma', () => ({ prisma: prismaMock }));
import { computeStreak, computeTrend, computeWorkoutWeeks, fetchAllTimePersonalRecords, getISOWeekKey } from './getDashboardHelpers';
import type { MetricKey } from './dashboard.types';

describe('computeTrend', () => {
  it('returns stable for fewer than 4 data points', () => {
    expect(computeTrend([5, 6, 7])).toBe('stable');
  });

  it('returns stable for flat history', () => {
    expect(computeTrend([5, 5, 5, 5, 5])).toBe('stable');
  });

  it('returns improving when recent avg is >10% higher', () => {
    expect(computeTrend([4, 4, 4, 6, 6, 6])).toBe('improving');
  });

  it('returns declining when recent avg is >10% lower', () => {
    expect(computeTrend([8, 8, 8, 6, 6, 6])).toBe('declining');
  });

  it('returns stable when prev avg is 0', () => {
    expect(computeTrend([0, 0, 0, 5, 5, 5])).toBe('stable');
  });
});

describe('computeWorkoutWeeks', () => {
  it('returns 0 for empty dates', () => {
    expect(computeWorkoutWeeks([])).toBe(0);
  });

  it('returns 0 when fewer than 3 sessions in any week', () => {
    const dates = [new Date('2026-01-05'), new Date('2026-01-06')];
    expect(computeWorkoutWeeks(dates)).toBe(0);
  });

  it('returns 1 when exactly 3 sessions in one week', () => {
    const dates = [
      new Date('2026-01-05'),
      new Date('2026-01-06'),
      new Date('2026-01-07'),
    ];
    expect(computeWorkoutWeeks(dates)).toBe(1);
  });
});

describe('getISOWeekKey', () => {
  it('returns correct ISO week key', () => {
    const result = getISOWeekKey(new Date('2026-01-05'));
    expect(result).toMatch(/^2026-W\d{2}$/);
  });

  it('returns consistent key for same week', () => {
    const mon = getISOWeekKey(new Date('2026-01-05'));
    const tue = getISOWeekKey(new Date('2026-01-06'));
    expect(mon).toBe(tue);
  });
});

describe('fetchAllTimePersonalRecords', () => {
  const metricLabels: Record<MetricKey, string> = {
    connectorRepetition: 'Connector Repetition',
    structuralVariety: 'Structural Variety',
    vocabularyPrecision: 'Vocabulary Precision',
    verbAccuracy: 'Verb Accuracy',
    argumentClosure: 'Argument Closure',
    fillerUsage: 'Filler Usage',
    pronunciationAccuracy: 'Pronunciation Accuracy',
    prosodyScore: 'Prosody Score',
    speakingRate: 'Speaking Rate',
    lexicalSophistication: 'Lexical Sophistication',
    registerPragmatics: 'Register Pragmatics',
  };

  const isMetricKey = (key: string): key is MetricKey => key in metricLabels;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns empty array when no metric snapshots exist', async () => {
    vi.mocked(prismaMock.metricSnapshot.groupBy).mockResolvedValue([] as never);

    const result = await fetchAllTimePersonalRecords('user-1', metricLabels, isMetricKey);

    expect(result).toEqual([]);
  });

  it('returns personal records when snapshots exist', async () => {
    vi.mocked(prismaMock.metricSnapshot.groupBy).mockResolvedValue([
      { key: 'connectorRepetition', _max: { score: 9.5 } },
    ] as never);
    prismaMock.metricSnapshot.findFirst.mockResolvedValue({
      createdAt: new Date('2026-05-15T10:00:00Z'),
    } as never);

    const result = await fetchAllTimePersonalRecords('user-1', metricLabels, isMetricKey);

    expect(result).toHaveLength(1);
    expect(result[0]?.metricKey).toBe('connectorRepetition');
    expect(result[0]?.score).toBe(9.5);
    expect(result[0]?.timeframe).toBe('all-time');
    expect(result[0]?.previousBest).toBeNull();
  });

  it('skips rows with unknown metric keys', async () => {
    vi.mocked(prismaMock.metricSnapshot.groupBy).mockResolvedValue([
      { key: 'unknownMetric', _max: { score: 8.0 } },
    ] as never);

    const result = await fetchAllTimePersonalRecords('user-1', metricLabels, isMetricKey);

    expect(result).toEqual([]);
    expect(prismaMock.metricSnapshot.findFirst).not.toHaveBeenCalled();
  });

  it('skips rows where max score is null', async () => {
    vi.mocked(prismaMock.metricSnapshot.groupBy).mockResolvedValue([
      { key: 'connectorRepetition', _max: { score: null } },
    ] as never);

    const result = await fetchAllTimePersonalRecords('user-1', metricLabels, isMetricKey);

    expect(result).toEqual([]);
  });

  it('skips entries when bestSnapshot is not found', async () => {
    vi.mocked(prismaMock.metricSnapshot.groupBy).mockResolvedValue([
      { key: 'connectorRepetition', _max: { score: 9.0 } },
    ] as never);
    prismaMock.metricSnapshot.findFirst.mockResolvedValue(null as never);

    const result = await fetchAllTimePersonalRecords('user-1', metricLabels, isMetricKey);

    expect(result).toEqual([]);
  });
});

describe('computeStreak', () => {
  it('returns 0 for empty dates', () => {
    expect(computeStreak([])).toBe(0);
  });

  it('returns 1 when only today has a session', () => {
    expect(computeStreak([new Date()])).toBe(1);
  });

  it('counts consecutive days backward from today', () => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const twoDaysAgo = new Date(today);
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
    expect(computeStreak([today, yesterday, twoDaysAgo])).toBe(3);
  });

  it('breaks streak on gap day', () => {
    const today = new Date();
    const threeDaysAgo = new Date(today);
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    expect(computeStreak([today, threeDaysAgo])).toBe(1);
  });
});
