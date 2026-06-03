// Tests for confidence gate and naturalness flag merging — Tier 1/2/3
import { describe, it, expect } from 'vitest';
import { mergeNaturalnessFlags } from './confidenceGate';
import type { ClaudeNaturalnessItem } from './confidenceGate';
import type { NaturalnessFlagInput } from './naturalness.types';
import type { CorpusEvidence } from '@/lib/analysis/analysis.types';

const makeCalqueFlag = (original: string, suggested: string): NaturalnessFlagInput => ({
  originalPhrase: original,
  suggestedPhrase: suggested,
  flagType: 'calqued_collocation',
  dimension: 'collocation',
  confidence: 'high',
  collocationMetric: null,
  metricValue: null,
  l1TransferSource: 'hacer una fiesta',
  rationale: 'test rationale',
  shownToUser: true,
});

const makeClaudeItem = (original: string, suggested: string, dimension = 'collocation'): ClaudeNaturalnessItem => ({
  original,
  suggested,
  rationale: 'Claude detected this',
  dimension,
});

describe('mergeNaturalnessFlags', () => {
  it('returns only calque flags when no Claude items exist', () => {
    const calques = [makeCalqueFlag('make a party', 'throw a party, have a party')];
    const result = mergeNaturalnessFlags(calques, []);
    expect(result).toHaveLength(1);
    expect(result[0]?.confidence).toBe('high');
  });

  it('appends Claude items as low confidence', () => {
    const claudeItems = [makeClaudeItem('get a big success', 'achieve great success')];
    const result = mergeNaturalnessFlags([], claudeItems);
    expect(result).toHaveLength(1);
    expect(result[0]?.confidence).toBe('low');
    expect(result[0]?.flagType).toBe('weak_collocation');
  });

  it('deduplicates Claude items that overlap with calque flags', () => {
    const calques = [makeCalqueFlag('...decided to make a party at...', 'throw a party, have a party')];
    const claudeItems = [makeClaudeItem('make a party', 'throw a party')];
    const result = mergeNaturalnessFlags(calques, claudeItems);
    expect(result).toHaveLength(1);
  });

  it('keeps non-overlapping Claude items alongside calque flags', () => {
    const calques = [makeCalqueFlag('make a party', 'throw a party, have a party')];
    const claudeItems = [makeClaudeItem('do exercises', 'work out', 'collocation')];
    const result = mergeNaturalnessFlags(calques, claudeItems);
    expect(result).toHaveLength(2);
  });

  it('maps unknown dimensions to collocation', () => {
    const claudeItems = [makeClaudeItem('test phrase', 'better phrase', 'unknown_dimension')];
    const result = mergeNaturalnessFlags([], claudeItems);
    expect(result[0]?.dimension).toBe('collocation');
  });

  it('maps discourse_marker dimension to style_note flag type', () => {
    const claudeItems = [makeClaudeItem('so basically', 'in essence', 'discourse_marker')];
    const result = mergeNaturalnessFlags([], claudeItems);
    expect(result[0]?.flagType).toBe('style_note');
    expect(result[0]?.dimension).toBe('discourse_marker');
  });

  it('returns empty array when both inputs are empty', () => {
    expect(mergeNaturalnessFlags([], [])).toEqual([]);
  });

  describe('with corpus evidence (Tier 2)', () => {
    const corpusEvidence: CorpusEvidence = {
      vocabulary: new Map(),
      collocations: [
        {
          head: 'big',
          collocate: 'success',
          lookup: { headLemma: 'big', collocate: 'success', attested: true, mi: 4, logDice: 6.5, freq: 80, source: 'COCA' },
        },
      ],
      expressions: [
        {
          phrase: 'in essence',
          lookup: { canonical: 'in essence', type: 'formula', freq: 50, cefr: 'C1', senseNote: null, source: 'PHaVE', matchMethod: 'exact' as const },
        },
      ],
      stats: { totalContentWords: 50, matchedWords: 30, cefrDistribution: {}, avgFreqPerMillion: null },
    };

    it('upgrades confidence when collocation match has logDice >= 5', () => {
      const items = [makeClaudeItem('a big success', 'a great achievement')];
      const result = mergeNaturalnessFlags([], items, corpusEvidence);
      expect(result[0]?.confidence).toBe('high');
      expect(result[0]?.collocationMetric).toBe('logDice');
      expect(result[0]?.metricValue).toBe(6.5);
    });

    it('upgrades to medium confidence when attested with low logDice', () => {
      const lowDiceEvidence: CorpusEvidence = {
        vocabulary: new Map(),
        collocations: [{
          head: 'big',
          collocate: 'success',
          lookup: { headLemma: 'big', collocate: 'success', attested: true, mi: 2, logDice: 3.0, freq: 30, source: 'COCA' },
        }],
        expressions: [],
        stats: { totalContentWords: 50, matchedWords: 30, cefrDistribution: {}, avgFreqPerMillion: null },
      };
      const items = [makeClaudeItem('a big success', 'a great achievement')];
      const result = mergeNaturalnessFlags([], items, lowDiceEvidence);
      expect(result[0]?.confidence).toBe('medium');
      expect(result[0]?.collocationMetric).toBe('logDice');
      expect(result[0]?.metricValue).toBe(3.0);
    });

    it('upgrades confidence via MWE attestation', () => {
      const items = [makeClaudeItem('so basically in essence', 'fundamentally', 'discourse_marker')];
      const result = mergeNaturalnessFlags([], items, corpusEvidence);
      expect(result[0]?.confidence).toBe('medium');
      expect(result[0]?.collocationMetric).toBe('mwe_freq');
    });

    it('keeps low confidence when no corpus match found', () => {
      const items = [makeClaudeItem('very unique situation', 'unique situation', 'register')];
      const emptyEvidence: CorpusEvidence = {
        vocabulary: new Map(),
        collocations: [],
        expressions: [],
        stats: { totalContentWords: 0, matchedWords: 0, cefrDistribution: {}, avgFreqPerMillion: null },
      };
      const result = mergeNaturalnessFlags([], items, emptyEvidence);
      expect(result[0]?.confidence).toBe('low');
      expect(result[0]?.collocationMetric).toBeNull();
    });

    it('does not affect calque flags (already high confidence)', () => {
      const calques = [makeCalqueFlag('make a party', 'throw a party')];
      const result = mergeNaturalnessFlags(calques, [], corpusEvidence);
      expect(result[0]?.confidence).toBe('high');
      expect(result[0]?.collocationMetric).toBeNull();
    });
  });
});
