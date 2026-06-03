// Tests for hybrid scoring decision table — 6 rows + helper functions
import { describe, it, expect } from 'vitest';
import {
  scoreExpression,
  classifyCorpusStrength,
  qualifiesForCefrBoost,
  isB1Filler,
} from './hybridScoring';
import type { CorpusSignal, LlmJudgment } from './hybridScoring';

describe('classifyCorpusStrength', () => {
  it('returns absent when not attested and no metric data', () => {
    const signal: CorpusSignal = { attested: false, logDice: null, mi: null, freq: null };
    expect(classifyCorpusStrength(signal)).toBe('absent');
  });

  it('returns strong when attested with logDice >= 7', () => {
    const signal: CorpusSignal = { attested: true, logDice: 7, mi: null, freq: 50 };
    expect(classifyCorpusStrength(signal)).toBe('strong');
  });

  it('returns strong when attested with mi >= 5', () => {
    const signal: CorpusSignal = { attested: true, logDice: null, mi: 5, freq: 50 };
    expect(classifyCorpusStrength(signal)).toBe('strong');
  });

  it('returns weak when not attested', () => {
    const signal: CorpusSignal = { attested: false, logDice: 4, mi: 3, freq: 50 };
    expect(classifyCorpusStrength(signal)).toBe('weak');
  });

  it('returns weak when logDice < 3', () => {
    const signal: CorpusSignal = { attested: true, logDice: 2.9, mi: null, freq: 50 };
    expect(classifyCorpusStrength(signal)).toBe('weak');
  });

  it('returns weak when freq < 5', () => {
    const signal: CorpusSignal = { attested: true, logDice: null, mi: null, freq: 4 };
    expect(classifyCorpusStrength(signal)).toBe('weak');
  });

  it('returns mid for attested with moderate scores', () => {
    const signal: CorpusSignal = { attested: true, logDice: 5, mi: 3, freq: 50 };
    expect(classifyCorpusStrength(signal)).toBe('mid');
  });

  it('returns strong at exact logDice boundary (7.0)', () => {
    const signal: CorpusSignal = { attested: true, logDice: 7.0, mi: null, freq: 50 };
    expect(classifyCorpusStrength(signal)).toBe('strong');
  });

  it('returns mid just below logDice boundary (6.9)', () => {
    const signal: CorpusSignal = { attested: true, logDice: 6.9, mi: 4.9, freq: 50 };
    expect(classifyCorpusStrength(signal)).toBe('mid');
  });
});

describe('scoreExpression', () => {
  it('Row 1: attested + STRONG corpus + natural LLM → PASS HIGH', () => {
    const corpus: CorpusSignal = { attested: true, logDice: 8.2, mi: 6, freq: 100 };
    const llm: LlmJudgment = { natural: true, confidence: 0.9 };
    const result = scoreExpression(corpus, llm);
    expect(result.verdict).toBe('PASS');
    expect(result.confidence).toBe('high');
    expect(result.corpusSignal).toBe('strong');
  });

  it('Row 2: attested + STRONG corpus + unnatural LLM → PASS_CORPUS_OVERRIDE HIGH', () => {
    const corpus: CorpusSignal = { attested: true, logDice: 7, mi: 5, freq: 100 };
    const llm: LlmJudgment = { natural: false, confidence: 0.7 };
    const result = scoreExpression(corpus, llm);
    expect(result.verdict).toBe('PASS_CORPUS_OVERRIDE');
    expect(result.confidence).toBe('high');
    expect(result.reason).toContain('overrides');
  });

  it('Row 3: unattested/WEAK + unnatural LLM → FLAG HIGH', () => {
    const corpus: CorpusSignal = { attested: false, logDice: null, mi: null, freq: null };
    const llm: LlmJudgment = { natural: false, confidence: 0.6 };
    const result = scoreExpression(corpus, llm);
    expect(result.verdict).toBe('FLAG');
    expect(result.confidence).toBe('high');
  });

  it('Row 4: unattested/WEAK + natural high-conf LLM → PASS_WITH_NOTE LOW', () => {
    const corpus: CorpusSignal = { attested: false, logDice: null, mi: null, freq: null };
    const llm: LlmJudgment = { natural: true, confidence: 0.85 };
    const result = scoreExpression(corpus, llm);
    expect(result.verdict).toBe('PASS_WITH_NOTE');
    expect(result.confidence).toBe('low');
  });

  it('Row 5: unattested/WEAK + natural low-conf LLM → SOFT_FLAG MEDIUM', () => {
    const corpus: CorpusSignal = { attested: false, logDice: null, mi: null, freq: null };
    const llm: LlmJudgment = { natural: true, confidence: 0.84 };
    const result = scoreExpression(corpus, llm);
    expect(result.verdict).toBe('SOFT_FLAG');
    expect(result.confidence).toBe('medium');
  });

  it('Row 6: mid-range corpus + either LLM → DEFER_TO_LLM LOW', () => {
    const corpus: CorpusSignal = { attested: true, logDice: 5, mi: 3, freq: 50 };
    const llm: LlmJudgment = { natural: true, confidence: 0.7 };
    const result = scoreExpression(corpus, llm);
    expect(result.verdict).toBe('DEFER_TO_LLM');
    expect(result.confidence).toBe('low');
    expect(result.corpusSignal).toBe('mid');
  });

  it('includes metric values in reason strings', () => {
    const corpus: CorpusSignal = { attested: true, logDice: 8.2, mi: null, freq: 100 };
    const llm: LlmJudgment = { natural: true, confidence: 0.9 };
    const result = scoreExpression(corpus, llm);
    expect(result.reason).toContain('logDice: 8.2');
  });

  it('uses weak signal for WEAK corpus with unattested flag', () => {
    const corpus: CorpusSignal = { attested: true, logDice: 2, mi: null, freq: 3 };
    const llm: LlmJudgment = { natural: false, confidence: 0.5 };
    const result = scoreExpression(corpus, llm);
    expect(result.verdict).toBe('FLAG');
    expect(result.corpusSignal).toBe('weak');
  });
});

describe('qualifiesForCefrBoost', () => {
  it('C1 + attested → true', () => {
    expect(qualifiesForCefrBoost('C1', true)).toBe(true);
  });

  it('C2 + attested → true', () => {
    expect(qualifiesForCefrBoost('C2', true)).toBe(true);
  });

  it('B2 + attested → false', () => {
    expect(qualifiesForCefrBoost('B2', true)).toBe(false);
  });

  it('C1 + not attested → false', () => {
    expect(qualifiesForCefrBoost('C1', false)).toBe(false);
  });

  it('null cefr → false', () => {
    expect(qualifiesForCefrBoost(null, true)).toBe(false);
  });

  it('handles lowercase cefr', () => {
    expect(qualifiesForCefrBoost('c1', true)).toBe(true);
  });
});

describe('isB1Filler', () => {
  it('A1 + freq > 500 → true', () => {
    expect(isB1Filler('A1', 4521)).toBe(true);
  });

  it('B1 + freq > 500 → true', () => {
    expect(isB1Filler('B1', 501)).toBe(true);
  });

  it('B2 + freq > 500 → false', () => {
    expect(isB1Filler('B2', 4521)).toBe(false);
  });

  it('A1 + freq < 500 → false', () => {
    expect(isB1Filler('A1', 499)).toBe(false);
  });

  it('null cefr → false', () => {
    expect(isB1Filler(null, 4521)).toBe(false);
  });

  it('null freq → false', () => {
    expect(isB1Filler('A1', null)).toBe(false);
  });
});
