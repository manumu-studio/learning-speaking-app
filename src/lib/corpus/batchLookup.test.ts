// Tests for batchLookup — grouping, dedup, source priority across multiple words
import { describe, it, expect, vi } from 'vitest';
import { prismaMock } from '@/__mocks__/prisma';

vi.mock('@/lib/prisma', () => ({ prisma: prismaMock }));

import { batchLookup } from './batchLookup';

const makeLexeme = (lemma: string, source: string, freq: number | null, cefr: string | null = null) => ({
  id: `${lemma}-${source}`,
  lemma,
  pos: '',
  freqPerMillion: freq,
  spokenFreqPerM: null,
  rank: null,
  zipf: null,
  cefr,
  sfi: null,
  source,
});

describe('batchLookup', () => {
  it('returns empty map for empty input', async () => {
    const result = await batchLookup([]);
    expect(result.size).toBe(0);
    expect(prismaMock.lexeme.findMany).not.toHaveBeenCalled();
  });

  it('deduplicates input words (case-insensitive)', async () => {
    prismaMock.lexeme.findMany.mockResolvedValueOnce([]);

    await batchLookup(['Hello', 'hello', 'HELLO']);

    expect(prismaMock.lexeme.findMany).toHaveBeenCalledWith({
      where: { lemma: { in: ['hello'] } },
    });
  });

  it('groups by lemma and picks best source per word', async () => {
    prismaMock.lexeme.findMany.mockResolvedValueOnce([
      makeLexeme('however', 'SUBTLEX', 200),
      makeLexeme('however', 'NGSL', 180),
      makeLexeme('therefore', 'NAWL', 50),
    ]);

    const result = await batchLookup(['however', 'therefore']);

    expect(result.size).toBe(2);
    expect(result.get('however')).toMatchObject({ source: 'NGSL' });
    expect(result.get('therefore')).toMatchObject({ source: 'NAWL' });
  });

  it('resolves CEFR from a different source row', async () => {
    prismaMock.lexeme.findMany.mockResolvedValueOnce([
      makeLexeme('complex', 'NGSL', 90),
      makeLexeme('complex', 'CEFR_J', null, 'B2'),
    ]);

    const result = await batchLookup(['complex']);

    expect(result.get('complex')).toMatchObject({
      source: 'NGSL',
      cefr: 'B2',
    });
  });

  it('falls back to first row when no source has freqPerMillion', async () => {
    prismaMock.lexeme.findMany.mockResolvedValueOnce([
      makeLexeme('niche', 'CEFR_J', null, 'C1'),
      makeLexeme('niche', 'OCTANOVE', null, 'C2'),
    ]);

    const result = await batchLookup(['niche']);

    expect(result.get('niche')).toMatchObject({
      source: 'CEFR_J',
      cefr: 'C1',
    });
  });

  it('skips words with no DB match', async () => {
    prismaMock.lexeme.findMany.mockResolvedValueOnce([
      makeLexeme('known', 'NGSL', 300),
    ]);

    const result = await batchLookup(['known', 'xyzzyplugh']);

    expect(result.size).toBe(1);
    expect(result.has('known')).toBe(true);
    expect(result.has('xyzzyplugh')).toBe(false);
  });
});
