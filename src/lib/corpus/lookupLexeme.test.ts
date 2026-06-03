// Tests for lookupLexeme — source priority, CEFR resolution, null case
import { describe, it, expect, vi } from 'vitest';
import { prismaMock } from '@/__mocks__/prisma';

vi.mock('@/lib/prisma', () => ({ prisma: prismaMock }));

import { lookupLexeme } from './lookupLexeme';

const baseLexeme = {
  id: '1',
  lemma: 'however',
  pos: '',
  spokenFreqPerM: null,
  sfi: null,
};

describe('lookupLexeme', () => {
  it('returns null when no rows match', async () => {
    prismaMock.lexeme.findMany.mockResolvedValueOnce([]);
    const result = await lookupLexeme('nonexistent');
    expect(result).toBeNull();
  });

  it('picks NGSL over SUBTLEX when both have freqPerMillion', async () => {
    prismaMock.lexeme.findMany.mockResolvedValueOnce([
      { ...baseLexeme, source: 'SUBTLEX', freqPerMillion: 200, zipf: 3.5, cefr: null, rank: 500 },
      { ...baseLexeme, source: 'NGSL', freqPerMillion: 180, zipf: null, cefr: null, rank: 42 },
    ]);

    const result = await lookupLexeme('however');

    expect(result).toMatchObject({
      source: 'NGSL',
      freqPerMillion: 180,
      rank: 42,
    });
  });

  it('skips sources without freqPerMillion when resolving priority', async () => {
    prismaMock.lexeme.findMany.mockResolvedValueOnce([
      { ...baseLexeme, source: 'NGSL', freqPerMillion: null, zipf: null, cefr: null, rank: null },
      { ...baseLexeme, source: 'SUBTLEX', freqPerMillion: 150, zipf: 3.2, cefr: null, rank: null },
    ]);

    const result = await lookupLexeme('however');

    expect(result).toMatchObject({ source: 'SUBTLEX' });
  });

  it('falls back to first row when no source has freqPerMillion', async () => {
    prismaMock.lexeme.findMany.mockResolvedValueOnce([
      { ...baseLexeme, source: 'CEFR_J', freqPerMillion: null, zipf: null, cefr: 'B2', rank: null },
      { ...baseLexeme, source: 'OCTANOVE', freqPerMillion: null, zipf: null, cefr: 'C1', rank: null },
    ]);

    const result = await lookupLexeme('however');

    expect(result).toMatchObject({ source: 'CEFR_J' });
  });

  it('resolves CEFR from a separate row', async () => {
    prismaMock.lexeme.findMany.mockResolvedValueOnce([
      { ...baseLexeme, source: 'NGSL', freqPerMillion: 180, zipf: null, cefr: null, rank: 42 },
      { ...baseLexeme, source: 'CEFR_J', freqPerMillion: null, zipf: null, cefr: 'B1', rank: null },
    ]);

    const result = await lookupLexeme('however');

    expect(result).toMatchObject({
      source: 'NGSL',
      cefr: 'B1',
    });
  });

  it('filters by pos when provided', async () => {
    prismaMock.lexeme.findMany.mockResolvedValueOnce([
      { ...baseLexeme, pos: 'adv', source: 'NGSL', freqPerMillion: 180, zipf: null, cefr: null, rank: 42 },
    ]);

    await lookupLexeme('however', 'adv');

    expect(prismaMock.lexeme.findMany).toHaveBeenCalledWith({
      where: { lemma: 'however', pos: 'adv' },
    });
  });

  it('normalizes lemma to lowercase', async () => {
    prismaMock.lexeme.findMany.mockResolvedValueOnce([]);

    await lookupLexeme('HOWEVER');

    expect(prismaMock.lexeme.findMany).toHaveBeenCalledWith({
      where: { lemma: 'however' },
    });
  });
});
