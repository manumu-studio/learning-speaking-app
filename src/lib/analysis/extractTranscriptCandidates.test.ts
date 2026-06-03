// Tests for transcript candidate extraction — content words, pairs, and phrase ngrams
import { describe, it, expect } from 'vitest';
import { extractTranscriptCandidates } from './extractTranscriptCandidates';

describe('extractTranscriptCandidates', () => {
  it('extracts content words, filtering stop words', () => {
    const result = extractTranscriptCandidates('The quick brown fox jumps over the lazy dog');
    expect(result.contentWords).toContain('quick');
    expect(result.contentWords).toContain('brown');
    expect(result.contentWords).toContain('fox');
    expect(result.contentWords).not.toContain('the');
    expect(result.contentWords).not.toContain('the');
  });

  it('lowercases and strips punctuation', () => {
    const result = extractTranscriptCandidates('Hello, World! Testing... 123.');
    expect(result.contentWords).toContain('hello');
    expect(result.contentWords).toContain('world');
    expect(result.contentWords).toContain('testing');
    expect(result.contentWords).toContain('123');
  });

  it('creates bigrams from content words', () => {
    const result = extractTranscriptCandidates('The quick brown fox jumps');
    const pairStrings = result.pairs.map((p) => `${p.head}::${p.collocate}`);
    expect(pairStrings).toContain('quick::brown');
    expect(pairStrings).toContain('brown::fox');
    expect(pairStrings).toContain('fox::jumps');
  });

  it('creates 2-4 word ngrams for phrase candidates', () => {
    const result = extractTranscriptCandidates('in terms of the problem');
    expect(result.phraseCandidates).toContain('in terms');
    expect(result.phraseCandidates).toContain('terms of');
    expect(result.phraseCandidates).toContain('in terms of');
    expect(result.phraseCandidates).toContain('in terms of the');
  });

  it('handles empty string', () => {
    const result = extractTranscriptCandidates('');
    expect(result.contentWords).toHaveLength(0);
    expect(result.pairs).toHaveLength(0);
    expect(result.phraseCandidates).toHaveLength(0);
  });

  it('handles single word', () => {
    const result = extractTranscriptCandidates('hello');
    expect(result.contentWords).toHaveLength(1);
    expect(result.pairs).toHaveLength(0);
  });

  it('preserves all content word occurrences (not deduped)', () => {
    const result = extractTranscriptCandidates('hello world hello world hello');
    expect(result.contentWords).toEqual(['hello', 'world', 'hello', 'world', 'hello']);
  });

  it('deduplicates pairs', () => {
    const result = extractTranscriptCandidates('big red big red big red');
    const pairCount = result.pairs.filter(
      (p) => p.head === 'big' && p.collocate === 'red',
    ).length;
    expect(pairCount).toBe(1);
  });

  it('caps pairs at 60', () => {
    const words = Array.from({ length: 200 }, (_, i) => `word${i}`).join(' ');
    const result = extractTranscriptCandidates(words);
    expect(result.pairs.length).toBeLessThanOrEqual(60);
  });

  it('caps phrases at 80', () => {
    const words = Array.from({ length: 200 }, (_, i) => `word${i}`).join(' ');
    const result = extractTranscriptCandidates(words);
    expect(result.phraseCandidates.length).toBeLessThanOrEqual(80);
  });

  it('skips all-stop-word ngrams', () => {
    const result = extractTranscriptCandidates('the and in the');
    const allStopPhrases = result.phraseCandidates.filter(
      (p) => p === 'the and' || p === 'and in' || p === 'in the',
    );
    expect(allStopPhrases).toHaveLength(0);
  });
});
