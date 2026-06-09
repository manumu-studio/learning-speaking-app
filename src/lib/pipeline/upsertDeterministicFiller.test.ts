// Tests for deterministic filler metric upsert — verifies DB persistence of verbatim-derived fillerUsage
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    metricSnapshot: { upsert: vi.fn() },
  },
}));

vi.mock('@/lib/analysis/countVerbatimFillers', () => ({
  countVerbatimFillers: vi.fn(),
}));

import { prisma } from '@/lib/prisma';
import { countVerbatimFillers } from '@/lib/analysis/countVerbatimFillers';
import { upsertDeterministicFiller } from './upsertDeterministicFiller';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('upsertDeterministicFiller', () => {
  it('calls countVerbatimFillers and upserts the result as fillerUsage metric', async () => {
    vi.mocked(countVerbatimFillers).mockReturnValue({
      fillerCount: 3,
      totalWords: 50,
      fillerDensityPercent: 6,
      score: 5,
      level: 'developing',
      note: '6.0% filler density (3 fillers / 50 words). Top: um (2), uh (1)',
      topFillers: [{ word: 'um', count: 2 }, { word: 'uh', count: 1 }],
    });
    vi.mocked(prisma.metricSnapshot.upsert).mockResolvedValue({} as never);

    await upsertDeterministicFiller('sess-1', 'um I think uh it was um good');

    expect(countVerbatimFillers).toHaveBeenCalledWith('um I think uh it was um good');
    expect(prisma.metricSnapshot.upsert).toHaveBeenCalledWith({
      where: { sessionId_key: { sessionId: 'sess-1', key: 'fillerUsage' } },
      create: { sessionId: 'sess-1', key: 'fillerUsage', score: 5, level: 'developing', note: expect.any(String) },
      update: { score: 5, level: 'developing', note: expect.any(String) },
    });
  });

  it('uses upsert so it works for both new and existing metric rows', async () => {
    vi.mocked(countVerbatimFillers).mockReturnValue({
      fillerCount: 0,
      totalWords: 10,
      fillerDensityPercent: 0,
      score: 10,
      level: 'excellent',
      note: 'No fillers detected in verbatim transcript',
      topFillers: [],
    });
    vi.mocked(prisma.metricSnapshot.upsert).mockResolvedValue({} as never);

    await upsertDeterministicFiller('sess-1', 'clean speech here');

    expect(prisma.metricSnapshot.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { sessionId_key: { sessionId: 'sess-1', key: 'fillerUsage' } },
        create: expect.objectContaining({ score: 10, level: 'excellent' }),
        update: expect.objectContaining({ score: 10, level: 'excellent' }),
      }),
    );
  });
});
