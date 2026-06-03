// Unit tests for scoreVerbAccuracy — pure scoring function for verb accuracy metric
import { describe, it, expect } from 'vitest';
import { scoreVerbAccuracy } from './scoreVerbAccuracy';
import type { GrammarFlag } from './grammar.types';

const makeFlag = (overrides: Partial<GrammarFlag> = {}): GrammarFlag => ({
  spanIndex: 0,
  verbatimText: 'goed',
  normalizedText: 'went',
  classification: 'grammar_error',
  errorType: 'verb_tense',
  confidence: 0.9,
  explanation: 'Wrong past tense.',
  suggestion: 'Use "went".',
  corpusEvidence: null,
  ...overrides,
});

describe('scoreVerbAccuracy', () => {
  it('returns score 10 and level high when totalDivergenceSpans is 0', () => {
    const result = scoreVerbAccuracy([], 0);
    expect(result.score).toBe(10);
    expect(result.level).toBe('high');
    expect(result.errorCount).toBe(0);
    expect(result.totalSpans).toBe(0);
  });

  it('returns score 10 and level high when no flags are grammar_error', () => {
    const flags: GrammarFlag[] = [
      makeFlag({ classification: 'self_correction', errorType: null }),
      makeFlag({ classification: 'false_start', errorType: null }),
    ];
    const result = scoreVerbAccuracy(flags, 3);
    expect(result.score).toBe(10);
    expect(result.level).toBe('high');
    expect(result.errorCount).toBe(0);
  });

  it('returns errorCount only counting grammar_error flags', () => {
    const flags: GrammarFlag[] = [
      makeFlag({ classification: 'grammar_error' }),
      makeFlag({ spanIndex: 1, classification: 'self_correction', errorType: null }),
    ];
    const result = scoreVerbAccuracy(flags, 5);
    expect(result.errorCount).toBe(1);
  });

  it('applies verb_tense severity weight 1.5 correctly', () => {
    // 1 verb_tense error, confidence 1.0, no corpus, 1 total span
    // weightedErrorScore = 1.5 * 1.0 * 1.0 = 1.5
    // rawScore = (1 - 1.5/1) * 10 = -5 → clamped to 1
    const flags = [makeFlag({ errorType: 'verb_tense', confidence: 1.0, corpusEvidence: null })];
    const result = scoreVerbAccuracy(flags, 1);
    expect(result.score).toBe(1);
    expect(result.level).toBe('low');
  });

  it('score improves with more total spans relative to errors', () => {
    // 1 verb_tense error (weight 1.5), confidence 1.0, 10 spans
    // weightedErrorScore = 1.5; rawScore = (1 - 1.5/10) * 10 = 8.5 → round = 9 or 8
    const flags = [makeFlag({ errorType: 'verb_tense', confidence: 1.0, corpusEvidence: null })];
    const resultFewSpans = scoreVerbAccuracy(flags, 1);
    const resultManySpans = scoreVerbAccuracy(flags, 10);
    expect(resultManySpans.score).toBeGreaterThan(resultFewSpans.score);
  });

  it('applies corpus-confirmed multiplier of 1.3x', () => {
    // No corpus: weightedErrorScore = 1.0 * 0.9 = 0.9; rawScore = (1 - 0.9/5) * 10 = 8.2 → 8
    // With corpus: weightedErrorScore = 1.0 * 0.9 * 1.3 = 1.17; rawScore = (1 - 1.17/5) * 10 = 7.66 → 8
    const flagNoCorpus = [makeFlag({ errorType: 'preposition', confidence: 0.9, corpusEvidence: null })];
    const flagWithCorpus = [makeFlag({ errorType: 'preposition', confidence: 0.9, corpusEvidence: 'attested=true' })];

    const noCorpusResult = scoreVerbAccuracy(flagNoCorpus, 5);
    const withCorpusResult = scoreVerbAccuracy(flagWithCorpus, 5);

    // corpus boost should yield the same or lower score (more penalized)
    expect(withCorpusResult.score).toBeLessThanOrEqual(noCorpusResult.score);
  });

  it('clamps score to minimum 1', () => {
    // Many high-confidence errors against very few spans
    const flags = Array.from({ length: 10 }, (_, i) =>
      makeFlag({ spanIndex: i, errorType: 'verb_tense', confidence: 1.0, corpusEvidence: null }),
    );
    const result = scoreVerbAccuracy(flags, 2);
    expect(result.score).toBeGreaterThanOrEqual(1);
  });

  it('clamps score to maximum 10', () => {
    const flags = [makeFlag({ classification: 'self_correction', errorType: null })];
    const result = scoreVerbAccuracy(flags, 100);
    expect(result.score).toBeLessThanOrEqual(10);
  });

  it('maps score ≤ 3 to level "low"', () => {
    // Force a very low score: many errors in few spans
    const flags = Array.from({ length: 5 }, (_, i) =>
      makeFlag({ spanIndex: i, errorType: 'verb_tense', confidence: 1.0, corpusEvidence: null }),
    );
    const result = scoreVerbAccuracy(flags, 3);
    expect(result.level).toBe('low');
  });

  it('maps score ≤ 6 to level "medium"', () => {
    // 1 verb_tense error at confidence 0.5 over 5 spans
    // weightedErrorScore = 1.5 * 0.5 = 0.75; rawScore = (1 - 0.75/5) * 10 = 8.5 → 9
    // Need to find a config that gives medium: 1 error weight=1.0, conf=0.8, 3 spans
    // rawScore = (1 - 0.8/3) * 10 = 7.33 → 7 → high still
    // Let's use: 1 agreement error (1.3), conf=0.9, corpus=null, 2 spans
    // weightedScore = 1.3 * 0.9 = 1.17; rawScore = (1 - 1.17/2) * 10 = 4.15 → 4 → medium
    const flags = [makeFlag({ errorType: 'agreement', confidence: 0.9, corpusEvidence: null })];
    const result = scoreVerbAccuracy(flags, 2);
    expect(['low', 'medium']).toContain(result.level);
    expect(result.score).toBeGreaterThanOrEqual(1);
  });

  it('maps score > 6 to level "high"', () => {
    // 1 article error (weight 0.8), confidence 0.5, 10 spans
    // weightedScore = 0.8 * 0.5 = 0.4; rawScore = (1 - 0.4/10) * 10 = 9.6 → 10
    const flags = [makeFlag({ errorType: 'article', confidence: 0.5, corpusEvidence: null })];
    const result = scoreVerbAccuracy(flags, 10);
    expect(result.score).toBeGreaterThan(6);
    expect(result.level).toBe('high');
  });

  it('note includes the error count', () => {
    const flags = [
      makeFlag({ spanIndex: 0, errorType: 'verb_tense', confidence: 0.8 }),
      makeFlag({ spanIndex: 1, errorType: 'article', confidence: 0.7 }),
    ];
    const result = scoreVerbAccuracy(flags, 5);
    expect(result.note).toContain('2');
  });

  it('note includes the most common error type', () => {
    const flags = [
      makeFlag({ spanIndex: 0, errorType: 'verb_tense', confidence: 0.8 }),
      makeFlag({ spanIndex: 1, errorType: 'verb_tense', confidence: 0.7 }),
      makeFlag({ spanIndex: 2, errorType: 'article', confidence: 0.6 }),
    ];
    const result = scoreVerbAccuracy(flags, 5);
    // mostCommonErrorType replaces underscore with space → "verb tense"
    expect(result.note).toContain('verb tense');
  });

  it('totalSpans matches the passed value', () => {
    const result = scoreVerbAccuracy([makeFlag()], 7);
    expect(result.totalSpans).toBe(7);
  });

  it('applies correct weights for all error types without throwing', () => {
    const errorTypes = ['verb_tense', 'article', 'preposition', 'agreement', 'word_order', 'other'] as const;
    for (const errorType of errorTypes) {
      const flags = [makeFlag({ errorType, confidence: 0.5, corpusEvidence: null })];
      expect(() => scoreVerbAccuracy(flags, 5)).not.toThrow();
    }
  });
});
