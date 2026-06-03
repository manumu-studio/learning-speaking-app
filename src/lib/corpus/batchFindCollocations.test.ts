// Tests for batch collocation lookup — single Prisma query for multiple word pairs
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    collocation: {
      findMany: vi.fn(),
    },
  },
}));

import { prisma } from '@/lib/prisma';
import { batchFindCollocations } from './batchFindCollocations';

describe('batchFindCollocations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns empty Map for empty input', async () => {
    const result = await batchFindCollocations([]);
    expect(result.size).toBe(0);
    expect(vi.mocked(prisma.collocation.findMany)).not.toHaveBeenCalled();
  });

  it('returns Map keyed by head::collocate', async () => {
    vi.mocked(prisma.collocation.findMany).mockResolvedValue([
      { headLemma: 'make', collocate: 'decision', mi: 8.2, logDice: 9.1, freq: 500, source: 'COCA' },
    ] as never);

    const result = await batchFindCollocations([{ head: 'make', collocate: 'decision' }]);
    expect(result.has('make::decision')).toBe(true);
    const lookup = result.get('make::decision');
    expect(lookup?.mi).toBe(8.2);
    expect(lookup?.attested).toBe(true);
  });

  it('picks highest MI when multiple matches exist', async () => {
    vi.mocked(prisma.collocation.findMany).mockResolvedValue([
      { headLemma: 'make', collocate: 'decision', mi: 5.0, logDice: 6, freq: 100, source: 'ACL' },
      { headLemma: 'make', collocate: 'decision', mi: 8.2, logDice: 9.1, freq: 500, source: 'COCA' },
    ] as never);

    const result = await batchFindCollocations([{ head: 'make', collocate: 'decision' }]);
    expect(result.get('make::decision')?.mi).toBe(8.2);
  });

  it('lowercases input pairs', async () => {
    vi.mocked(prisma.collocation.findMany).mockResolvedValue([]);
    await batchFindCollocations([{ head: 'MAKE', collocate: 'DECISION' }]);

    const call = vi.mocked(prisma.collocation.findMany).mock.calls[0];
    const orClause = (call?.[0] as Record<string, unknown>)?.where as Record<string, unknown>;
    const pairs = orClause?.OR as Array<Record<string, string>>;
    expect(pairs?.[0]?.headLemma).toBe('make');
    expect(pairs?.[0]?.collocate).toBe('decision');
  });

  it('deduplicates input pairs', async () => {
    vi.mocked(prisma.collocation.findMany).mockResolvedValue([]);
    await batchFindCollocations([
      { head: 'make', collocate: 'decision' },
      { head: 'make', collocate: 'decision' },
      { head: 'MAKE', collocate: 'DECISION' },
    ]);

    const call = vi.mocked(prisma.collocation.findMany).mock.calls[0];
    const orClause = (call?.[0] as Record<string, unknown>)?.where as Record<string, unknown>;
    const pairs = orClause?.OR as Array<Record<string, string>>;
    expect(pairs).toHaveLength(1);
  });

  it('handles Prisma returning no results', async () => {
    vi.mocked(prisma.collocation.findMany).mockResolvedValue([]);
    const result = await batchFindCollocations([{ head: 'xyz', collocate: 'abc' }]);
    expect(result.size).toBe(0);
  });
});
