// Tests for batch MWE attestation — single Prisma query for multiple phrases
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    multiWordExpression: {
      findMany: vi.fn(),
    },
  },
}));

import { prisma } from '@/lib/prisma';
import { batchAttestExpressions } from './batchAttestExpressions';

describe('batchAttestExpressions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns empty Map for empty input', async () => {
    const result = await batchAttestExpressions([]);
    expect(result.size).toBe(0);
    expect(vi.mocked(prisma.multiWordExpression.findMany)).not.toHaveBeenCalled();
  });

  it('computes lemmaKey correctly (sorted comma-joined)', async () => {
    vi.mocked(prisma.multiWordExpression.findMany).mockResolvedValue([]);
    await batchAttestExpressions(['give up']);

    const call = vi.mocked(prisma.multiWordExpression.findMany).mock.calls[0];
    const where = (call?.[0] as Record<string, unknown>)?.where as Record<string, Record<string, string[]>>;
    expect(where?.lemmaKey?.in).toContain('give,up');
  });

  it('returns Map keyed by original phrase', async () => {
    vi.mocked(prisma.multiWordExpression.findMany).mockResolvedValue([
      { lemmaKey: 'in,of,terms', canonical: 'in terms of', type: 'formula', freq: 337, cefr: 'B2', senseNote: null, source: 'PHaVE' },
    ] as never);

    const result = await batchAttestExpressions(['in terms of']);
    expect(result.has('in terms of')).toBe(true);
    expect(result.get('in terms of')?.canonical).toBe('in terms of');
    expect(result.get('in terms of')?.matchMethod).toBe('exact');
  });

  it('deduplicates lemmaKeys', async () => {
    vi.mocked(prisma.multiWordExpression.findMany).mockResolvedValue([]);
    await batchAttestExpressions(['give up', 'up give']);

    const call = vi.mocked(prisma.multiWordExpression.findMany).mock.calls[0];
    const where = (call?.[0] as Record<string, unknown>)?.where as Record<string, Record<string, string[]>>;
    expect(where?.lemmaKey?.in).toHaveLength(1);
  });

  it('sets matchMethod to exact', async () => {
    vi.mocked(prisma.multiWordExpression.findMany).mockResolvedValue([
      { lemmaKey: 'give,up', canonical: 'give up', type: 'phrasal_verb', freq: 100, cefr: 'B1', senseNote: null, source: 'PHaVE' },
    ] as never);

    const result = await batchAttestExpressions(['give up']);
    expect(result.get('give up')?.matchMethod).toBe('exact');
  });

  it('handles Prisma returning no results', async () => {
    vi.mocked(prisma.multiWordExpression.findMany).mockResolvedValue([]);
    const result = await batchAttestExpressions(['nonexistent phrase']);
    expect(result.size).toBe(0);
  });
});
