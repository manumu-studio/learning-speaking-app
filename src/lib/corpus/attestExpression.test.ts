// Tests for attestExpression — exact match, fuzzy fallback, null case
import { describe, it, expect, vi } from 'vitest';
import { prismaMock } from '@/__mocks__/prisma';

vi.mock('@/lib/prisma', () => ({ prisma: prismaMock }));

import { attestExpression } from './attestExpression';

describe('attestExpression', () => {
  it('returns null when neither exact nor fuzzy match found', async () => {
    prismaMock.multiWordExpression.findFirst.mockResolvedValueOnce(null);
    prismaMock.$queryRaw.mockResolvedValueOnce([]);

    const result = await attestExpression('completely unknown phrase');

    expect(result).toBeNull();
  });

  it('returns exact match with matchMethod=exact', async () => {
    prismaMock.multiWordExpression.findFirst.mockResolvedValueOnce({
      id: '1',
      canonical: 'carry out',
      lemmaKey: 'carry,out',
      type: 'phrasal_verb',
      freq: 45.2,
      spokenFreq: null,
      writtenFreq: null,
      ftw: null,
      cefr: 'B2',
      senseNote: null,
      source: 'PHAVE',
    });

    const result = await attestExpression('carry out');

    expect(result).toMatchObject({
      matchMethod: 'exact',
      canonical: 'carry out',
      source: 'PHAVE',
    });
  });

  it('falls back to fuzzy match when exact misses', async () => {
    prismaMock.multiWordExpression.findFirst.mockResolvedValueOnce(null);
    prismaMock.$queryRaw.mockResolvedValueOnce([
      {
        canonical: 'carry out',
        type: 'phrasal_verb',
        freq: 45.2,
        cefr: 'B2',
        senseNote: null,
        source: 'PHAVE',
        similarity: 0.45,
      },
    ]);

    const result = await attestExpression('carried out');

    expect(result).toMatchObject({
      matchMethod: 'fuzzy',
      canonical: 'carry out',
    });
  });

  it('normalizes phrase for lemmaKey lookup', async () => {
    prismaMock.multiWordExpression.findFirst.mockResolvedValueOnce(null);
    prismaMock.$queryRaw.mockResolvedValueOnce([]);

    await attestExpression('Make A Decision');

    expect(prismaMock.multiWordExpression.findFirst).toHaveBeenCalledWith({
      where: { lemmaKey: 'a,decision,make' },
    });
  });
});
