// Tests for Personal Records detection logic
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prismaMock } from '@/__mocks__/prisma';

vi.mock('@/lib/prisma', () => ({ prisma: prismaMock }));

import { detectPersonalRecords } from './personalRecords';

const sessionId = 'session-current';
const userId = 'user-1';
const sessionDate = new Date('2026-05-27T12:00:00.000Z');

function stubGroupBySequence(values: unknown[]) {
  const groupByMock = prismaMock.metricSnapshot.groupBy as unknown as {
    mockImplementation: (fn: () => Promise<unknown>) => void;
  };
  let callIndex = 0;
  groupByMock.mockImplementation(() => {
    const value = values[callIndex] ?? [];
    callIndex += 1;
    return Promise.resolve(value);
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('detectPersonalRecords', () => {
  it('detects all-time PR when score exceeds prior best', async () => {
    prismaMock.metricSnapshot.findMany.mockResolvedValue([
      { key: 'vocabularyPrecision', score: 75, sessionId },
    ] as never);

    stubGroupBySequence([
      [{ key: 'vocabularyPrecision', _max: { score: 60 } }],
      [{ key: 'vocabularyPrecision', _max: { score: 60 } }],
      [{ key: 'vocabularyPrecision', _max: { score: 55 } }],
    ]);

    const result = await detectPersonalRecords(userId, sessionId, sessionDate);

    expect(result).toHaveLength(1);
    expect(result[0]?.metricKey).toBe('vocabularyPrecision');
    expect(result[0]?.timeframe).toBe('all-time');
    expect(result[0]?.score).toBe(75);
    expect(result[0]?.previousBest).toBe(60);
  });

  it('returns no PR when score does not exceed prior best', async () => {
    prismaMock.metricSnapshot.findMany.mockResolvedValue([
      { key: 'vocabularyPrecision', score: 54, sessionId },
    ] as never);

    stubGroupBySequence([
      [{ key: 'vocabularyPrecision', _max: { score: 60 } }],
      [{ key: 'vocabularyPrecision', _max: { score: 60 } }],
      [{ key: 'vocabularyPrecision', _max: { score: 55 } }],
    ]);

    const result = await detectPersonalRecords(userId, sessionId, sessionDate);

    expect(result).toHaveLength(0);
  });

  it('detects 14-day PR only when all-time best is not beaten', async () => {
    prismaMock.metricSnapshot.findMany.mockResolvedValue([
      { key: 'vocabularyPrecision', score: 61, sessionId },
    ] as never);

    stubGroupBySequence([
      [{ key: 'vocabularyPrecision', _max: { score: 70 } }],
      [{ key: 'vocabularyPrecision', _max: { score: 65 } }],
      [{ key: 'vocabularyPrecision', _max: { score: 55 } }],
    ]);

    const result = await detectPersonalRecords(userId, sessionId, sessionDate);

    expect(result).toHaveLength(1);
    expect(result[0]?.timeframe).toBe('14-day');
    expect(result[0]?.previousBest).toBe(55);
  });

  it('qualifies first score for a metric as a PR with null previousBest', async () => {
    prismaMock.metricSnapshot.findMany.mockResolvedValue([
      { key: 'speakingRate', score: 50, sessionId },
    ] as never);

    stubGroupBySequence([[], [], []]);

    const result = await detectPersonalRecords(userId, sessionId, sessionDate);

    expect(result).toHaveLength(1);
    expect(result[0]?.timeframe).toBe('all-time');
    expect(result[0]?.previousBest).toBeNull();
  });
});
