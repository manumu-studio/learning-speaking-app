// Tests for corpus evidence XML prompt formatting
import { describe, it, expect } from 'vitest';
import { formatCorpusPrompt } from './formatCorpusPrompt';
import type { CorpusEvidence } from './analysis.types';

function makeEvidence(overrides: Partial<CorpusEvidence> = {}): CorpusEvidence {
  return {
    vocabulary: new Map([
      ['facilitate', { lemma: 'facilitate', pos: 'v', freqPerMillion: 42.3, zipf: null, cefr: 'C1', rank: 2341, source: 'NGSL' }],
      ['make', { lemma: 'make', pos: 'v', freqPerMillion: 4521.0, zipf: null, cefr: 'A1', rank: 23, source: 'NGSL' }],
    ]),
    collocations: [
      { head: 'make', collocate: 'decision', lookup: { headLemma: 'make', collocate: 'decision', attested: true, mi: 8.2, logDice: 9.1, freq: 500, source: 'COCA' } },
      { head: 'do', collocate: 'decision', lookup: null },
    ],
    expressions: [
      { phrase: 'in terms of', lookup: { canonical: 'in terms of', type: 'formula', freq: 337.0, cefr: 'B2', senseNote: null, source: 'PHaVE', matchMethod: 'exact' as const } },
    ],
    stats: { totalContentWords: 87, matchedWords: 62, cefrDistribution: { A1: 5, B2: 20, C1: 14 }, avgFreqPerMillion: 245.3 },
    ...overrides,
  };
}

describe('formatCorpusPrompt', () => {
  it('returns empty string when no evidence', () => {
    const empty: CorpusEvidence = {
      vocabulary: new Map(),
      collocations: [],
      expressions: [],
      stats: { totalContentWords: 0, matchedWords: 0, cefrDistribution: {}, avgFreqPerMillion: null },
    };
    expect(formatCorpusPrompt(empty)).toBe('');
  });

  it('formats vocabulary section with CEFR and freq', () => {
    const result = formatCorpusPrompt(makeEvidence());
    expect(result).toContain('lemma="make"');
    expect(result).toContain('cefr="A1"');
    expect(result).toContain('freq="4521.0/M"');
    expect(result).toContain('lemma="facilitate"');
    expect(result).toContain('cefr="C1"');
  });

  it('sorts vocabulary by freq descending', () => {
    const result = formatCorpusPrompt(makeEvidence());
    const makeIdx = result.indexOf('lemma="make"');
    const facilitateIdx = result.indexOf('lemma="facilitate"');
    expect(makeIdx).toBeLessThan(facilitateIdx);
  });

  it('formats collocations section with attested/mi/source', () => {
    const result = formatCorpusPrompt(makeEvidence());
    expect(result).toContain('head="make" collocate="decision"');
    expect(result).toContain('attested="true"');
    expect(result).toContain('mi="8.2"');
    expect(result).toContain('source="COCA"');
  });

  it('omits collocation pairs with null lookup', () => {
    const result = formatCorpusPrompt(makeEvidence());
    expect(result).not.toContain('head="do"');
  });

  it('formats expressions section with type/freq/cefr', () => {
    const result = formatCorpusPrompt(makeEvidence());
    expect(result).toContain('canonical="in terms of"');
    expect(result).toContain('type="formula"');
    expect(result).toContain('freq="337.0/M"');
    expect(result).toContain('cefr="B2"');
  });

  it('formats stats section with all fields', () => {
    const result = formatCorpusPrompt(makeEvidence());
    expect(result).toContain('content-words="87"');
    expect(result).toContain('matched="62"');
    expect(result).toContain('avg-freq="245.3/M"');
    expect(result).toContain('A1:5');
    expect(result).toContain('C1:14');
  });

  it('includes usage instructions', () => {
    const result = formatCorpusPrompt(makeEvidence());
    expect(result).toContain('Ground vocabularyPrecision');
    expect(result).toContain('MI >= 5');
  });

  it('handles null freq/cefr in vocabulary gracefully', () => {
    const evidence: CorpusEvidence = {
      vocabulary: new Map([
        ['unknown', { lemma: 'unknown', pos: '', freqPerMillion: null, zipf: null, cefr: null, rank: null, source: 'NGSL' }],
      ]),
      collocations: [],
      expressions: [],
      stats: { totalContentWords: 1, matchedWords: 1, cefrDistribution: {}, avgFreqPerMillion: null },
    };
    const result = formatCorpusPrompt(evidence);
    expect(result).toBe('');
  });

  it('caps vocabulary at 20 entries', () => {
    const bigVocab = new Map(
      Array.from({ length: 30 }, (_, i) => [
        `word${i}`,
        { lemma: `word${i}`, pos: '', freqPerMillion: 100 - i, zipf: null, cefr: 'B1', rank: i, source: 'NGSL' },
      ]),
    );
    const evidence = makeEvidence({ vocabulary: bigVocab });
    const result = formatCorpusPrompt(evidence);
    const matches = result.match(/<word /g);
    expect(matches).toHaveLength(20);
  });
});
