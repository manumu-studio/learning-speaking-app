// Tests for corpus evidence orchestrator — mocked corpus lookups
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/corpus', () => ({
  batchLookup: vi.fn(),
  batchFindCollocations: vi.fn(),
  batchAttestExpressions: vi.fn(),
}));

import { batchLookup, batchFindCollocations, batchAttestExpressions } from '@/lib/corpus';
import { buildCorpusEvidence } from './buildCorpusEvidence';

describe('buildCorpusEvidence', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(batchLookup).mockResolvedValue(
      new Map([
        ['quick', { lemma: 'quick', pos: 'adj', freqPerMillion: 120, zipf: 3.5, cefr: 'B1', rank: 800, source: 'NGSL' }],
        ['brown', { lemma: 'brown', pos: 'adj', freqPerMillion: 85, zipf: 3.2, cefr: 'A2', rank: 1200, source: 'NGSL' }],
        ['fox', { lemma: 'fox', pos: 'n', freqPerMillion: 15, zipf: 2.8, cefr: 'B2', rank: 3500, source: 'SUBTLEX' }],
      ]),
    );

    vi.mocked(batchFindCollocations).mockResolvedValue(
      new Map([
        ['quick::brown', { headLemma: 'quick', collocate: 'brown', attested: true, mi: 6.5, logDice: 8.0, freq: 200, source: 'COCA' }],
      ]),
    );

    vi.mocked(batchAttestExpressions).mockResolvedValue(
      new Map([
        ['quick brown', { canonical: 'quick brown', type: 'collocation', freq: 50, cefr: null, senseNote: null, source: 'COCA', matchMethod: 'exact' as const }],
      ]),
    );
  });

  it('runs three lookups in parallel via Promise.all', async () => {
    await buildCorpusEvidence('the quick brown fox jumps');
    expect(batchLookup).toHaveBeenCalledTimes(1);
    expect(batchFindCollocations).toHaveBeenCalledTimes(1);
    expect(batchAttestExpressions).toHaveBeenCalledTimes(1);
  });

  it('computes cefrDistribution correctly', async () => {
    const result = await buildCorpusEvidence('the quick brown fox jumps');
    expect(result.stats.cefrDistribution).toEqual({ A2: 1, B1: 1, B2: 1 });
  });

  it('computes avgFreqPerMillion correctly', async () => {
    const result = await buildCorpusEvidence('the quick brown fox jumps');
    const expected = (120 + 85 + 15) / 3;
    expect(result.stats.avgFreqPerMillion).toBeCloseTo(expected, 1);
  });

  it('returns null avgFreqPerMillion when all freqs are null', async () => {
    vi.mocked(batchLookup).mockResolvedValue(
      new Map([['word', { lemma: 'word', pos: '', freqPerMillion: null, zipf: null, cefr: null, rank: null, source: 'NGSL' }]]),
    );
    const result = await buildCorpusEvidence('word');
    expect(result.stats.avgFreqPerMillion).toBeNull();
  });

  it('only includes matched expressions (not null lookups)', async () => {
    const result = await buildCorpusEvidence('the quick brown fox jumps');
    for (const expr of result.expressions) {
      expect(expr.lookup).not.toBeNull();
    }
  });

  it('includes all collocation pairs (even with null lookup)', async () => {
    const result = await buildCorpusEvidence('the quick brown fox jumps');
    const withLookup = result.collocations.filter((c) => c.lookup !== null);
    const withoutLookup = result.collocations.filter((c) => c.lookup === null);
    expect(withLookup.length).toBeGreaterThan(0);
    expect(withoutLookup.length).toBeGreaterThan(0);
  });

  it('handles empty transcript', async () => {
    vi.mocked(batchLookup).mockResolvedValue(new Map());
    vi.mocked(batchFindCollocations).mockResolvedValue(new Map());
    vi.mocked(batchAttestExpressions).mockResolvedValue(new Map());

    const result = await buildCorpusEvidence('');
    expect(result.stats.totalContentWords).toBe(0);
    expect(result.stats.matchedWords).toBe(0);
    expect(result.collocations).toHaveLength(0);
    expect(result.expressions).toHaveLength(0);
  });
});
