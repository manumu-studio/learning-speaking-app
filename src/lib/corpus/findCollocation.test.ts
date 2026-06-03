// Tests for findCollocation — hit, miss, case normalization
import { describe, it, expect, vi } from 'vitest';
import { prismaMock } from '@/__mocks__/prisma';

vi.mock('@/lib/prisma', () => ({ prisma: prismaMock }));

import { findCollocation } from './findCollocation';

describe('findCollocation', () => {
  it('returns null when no match found', async () => {
    prismaMock.collocation.findFirst.mockResolvedValueOnce(null);

    const result = await findCollocation('make', 'nonexistent');

    expect(result).toBeNull();
  });

  it('returns collocation data with attested=true on match', async () => {
    prismaMock.collocation.findFirst.mockResolvedValueOnce({
      id: '1',
      headLemma: 'make',
      headPos: 'v',
      collocate: 'decision',
      collocatePos: 'n',
      relation: null,
      freq: 1200,
      mi: 8.5,
      logDice: 6.2,
      tScore: null,
      source: 'ACL',
    });

    const result = await findCollocation('make', 'decision');

    expect(result).toMatchObject({
      attested: true,
      mi: 8.5,
      source: 'ACL',
    });
  });

  it('normalizes input to lowercase', async () => {
    prismaMock.collocation.findFirst.mockResolvedValueOnce(null);

    await findCollocation('MAKE', 'Decision');

    expect(prismaMock.collocation.findFirst).toHaveBeenCalledWith({
      where: { headLemma: 'make', collocate: 'decision' },
      orderBy: { mi: 'desc' },
    });
  });
});
