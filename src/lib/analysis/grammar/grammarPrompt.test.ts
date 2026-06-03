// Unit tests for grammar prompt builders — verifies structure and key content sections
import { describe, it, expect } from 'vitest';
import { buildGrammarSystemPrompt, buildGrammarUserPrompt } from './grammarPrompt';
import type { DivergenceSpan } from '@/lib/analysis/divergence';

const makeSpan = (overrides: Partial<DivergenceSpan> = {}): DivergenceSpan => ({
  start: 0,
  end: 1,
  verbatimText: 'goed',
  normalizedText: 'went',
  type: 'substitution',
  confidence: 0.82,
  ...overrides,
});

describe('buildGrammarSystemPrompt', () => {
  it('returns a non-empty string', () => {
    const prompt = buildGrammarSystemPrompt();
    expect(typeof prompt).toBe('string');
    expect(prompt.length).toBeGreaterThan(0);
  });

  it('mentions all four classification categories', () => {
    const prompt = buildGrammarSystemPrompt();
    expect(prompt).toContain('grammar_error');
    expect(prompt).toContain('self_correction');
    expect(prompt).toContain('pronunciation_artifact');
    expect(prompt).toContain('false_start');
  });

  it('instructs Claude to return JSON only', () => {
    const prompt = buildGrammarSystemPrompt();
    expect(prompt).toContain('JSON only');
  });

  it('lists all errorType enum values', () => {
    const prompt = buildGrammarSystemPrompt();
    expect(prompt).toContain('verb_tense');
    expect(prompt).toContain('article');
    expect(prompt).toContain('preposition');
    expect(prompt).toContain('agreement');
    expect(prompt).toContain('word_order');
  });

  it('mentions the CONFIDENCE scale', () => {
    const prompt = buildGrammarSystemPrompt();
    expect(prompt).toContain('CONFIDENCE');
  });

  it('identifies itself as a grammar error classifier for B2-C1 learners', () => {
    const prompt = buildGrammarSystemPrompt();
    expect(prompt).toContain('grammar error classifier');
    expect(prompt).toContain('B2');
    expect(prompt).toContain('C1');
  });
});

describe('buildGrammarUserPrompt', () => {
  const baseOptions = {
    normalizedTranscript: 'I went home yesterday.',
    verbatimTranscript: 'I goed home um yesterday.',
    divergenceSpans: [makeSpan()],
    corpusEvidence: null,
  };

  it('includes the normalized transcript', () => {
    const prompt = buildGrammarUserPrompt(baseOptions);
    expect(prompt).toContain('I went home yesterday.');
  });

  it('includes the verbatim transcript', () => {
    const prompt = buildGrammarUserPrompt(baseOptions);
    expect(prompt).toContain('I goed home um yesterday.');
  });

  it('includes the DIVERGENCE SPANS: section header', () => {
    const prompt = buildGrammarUserPrompt(baseOptions);
    expect(prompt).toContain('DIVERGENCE SPANS:');
  });

  it('formats each span with index, type, confidence, verbatim and normalized text', () => {
    const prompt = buildGrammarUserPrompt(baseOptions);
    expect(prompt).toContain('[0]');
    expect(prompt).toContain('type=substitution');
    expect(prompt).toContain('confidence=0.82');
    expect(prompt).toContain('verbatim="goed"');
    expect(prompt).toContain('normalized="went"');
  });

  it('shows "(none)" when no spans are provided', () => {
    const prompt = buildGrammarUserPrompt({ ...baseOptions, divergenceSpans: [] });
    expect(prompt).toContain('(none)');
  });

  it('shows "No corpus evidence available." when corpusEvidence is null', () => {
    const prompt = buildGrammarUserPrompt({ ...baseOptions, corpusEvidence: null });
    expect(prompt).toContain('No corpus evidence available.');
  });

  it('shows the corpus evidence string when provided', () => {
    const evidence = '<corpus-evidence><stats content-words="5" /></corpus-evidence>';
    const prompt = buildGrammarUserPrompt({ ...baseOptions, corpusEvidence: evidence });
    expect(prompt).toContain(evidence);
    expect(prompt).not.toContain('No corpus evidence available.');
  });

  it('includes the CORPUS EVIDENCE: section header', () => {
    const prompt = buildGrammarUserPrompt(baseOptions);
    expect(prompt).toContain('CORPUS EVIDENCE:');
  });

  it('numbers multiple spans sequentially', () => {
    const spans = [
      makeSpan({ start: 0, end: 1, verbatimText: 'goed', normalizedText: 'went' }),
      makeSpan({ start: 3, end: 4, verbatimText: 'the car', normalizedText: 'a car', type: 'substitution' }),
    ];
    const prompt = buildGrammarUserPrompt({ ...baseOptions, divergenceSpans: spans });
    expect(prompt).toContain('[0]');
    expect(prompt).toContain('[1]');
  });
});
