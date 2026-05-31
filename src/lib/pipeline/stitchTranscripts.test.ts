// Tests for transcript overlap-and-stitch merger
import { describe, expect, it } from 'vitest';
import { findOverlapLength, stitchTranscripts } from './stitchTranscripts';

describe('findOverlapLength', () => {
  it('returns 0 when there is no overlap', () => {
    const tail = ['hello', 'world'];
    const head = ['foo', 'bar'];
    expect(findOverlapLength(tail, head)).toBe(0);
  });

  it('detects a 3-word overlap', () => {
    const tail = ['I', 'was', 'saying', 'the', 'quick', 'brown', 'fox'];
    const head = ['the', 'quick', 'brown', 'fox', 'jumped', 'over'];
    expect(findOverlapLength(tail, head)).toBe(4);
  });

  it('is case-insensitive and strips punctuation', () => {
    const tail = ['Hello,', 'World.'];
    const head = ['hello', 'world', 'extra'];
    expect(findOverlapLength(tail, head)).toBe(2);
  });

  it('caps comparison at 15 words', () => {
    const tail = Array.from({ length: 30 }, (_, i) => `word${i}`);
    const head = Array.from({ length: 30 }, (_, i) => `word${i + 15}`);
    const result = findOverlapLength(tail, head);
    expect(result).toBe(15);
  });

  it('returns 0 for empty arrays', () => {
    expect(findOverlapLength([], ['a', 'b'])).toBe(0);
    expect(findOverlapLength(['a', 'b'], [])).toBe(0);
  });
});

describe('stitchTranscripts', () => {
  it('returns empty string for empty input', () => {
    expect(stitchTranscripts([])).toBe('');
  });

  it('returns the single chunk text unchanged', () => {
    const chunks = [{ chunkIndex: 0, text: 'Hello world', overlapSecs: 0 }];
    expect(stitchTranscripts(chunks)).toBe('Hello world');
  });

  it('removes overlap from second chunk', () => {
    const chunks = [
      { chunkIndex: 0, text: 'The quick brown fox jumped', overlapSecs: 0 },
      { chunkIndex: 1, text: 'brown fox jumped over the lazy dog', overlapSecs: 5 },
    ];
    expect(stitchTranscripts(chunks)).toBe('The quick brown fox jumped over the lazy dog');
  });

  it('handles three chunks with overlaps', () => {
    const chunks = [
      { chunkIndex: 0, text: 'one two three four five', overlapSecs: 0 },
      { chunkIndex: 1, text: 'four five six seven eight', overlapSecs: 5 },
      { chunkIndex: 2, text: 'seven eight nine ten', overlapSecs: 5 },
    ];
    expect(stitchTranscripts(chunks)).toBe('one two three four five six seven eight nine ten');
  });

  it('handles chunks with no detectable overlap gracefully', () => {
    const chunks = [
      { chunkIndex: 0, text: 'alpha beta', overlapSecs: 0 },
      { chunkIndex: 1, text: 'gamma delta', overlapSecs: 5 },
    ];
    expect(stitchTranscripts(chunks)).toBe('alpha beta gamma delta');
  });

  it('tolerates empty text in a chunk', () => {
    const chunks = [
      { chunkIndex: 0, text: 'hello world', overlapSecs: 0 },
      { chunkIndex: 1, text: '', overlapSecs: 5 },
      { chunkIndex: 2, text: 'world goodbye', overlapSecs: 5 },
    ];
    const result = stitchTranscripts(chunks);
    expect(result).toContain('hello');
    expect(result).toContain('goodbye');
  });

  it('sorts chunks by chunkIndex regardless of input order', () => {
    const chunks = [
      { chunkIndex: 1, text: 'three four five six', overlapSecs: 5 },
      { chunkIndex: 0, text: 'one two three four', overlapSecs: 0 },
    ];
    expect(stitchTranscripts(chunks)).toBe('one two three four five six');
  });
});
