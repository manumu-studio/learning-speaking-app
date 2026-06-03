// Unit tests for transcript overlap deduplication at chunk boundaries
import { describe, expect, it } from 'vitest';
import {
  concatenateChunkTexts,
  concatenateChunkTranscripts,
  deduplicateChunkWords,
} from '@/lib/pipeline/transcriptDedup';

describe('transcriptDedup', () => {
  it('deduplicates overlapping prefix words from the next chunk', () => {
    const previous = [
      { word: 'hello', start: 118, end: 118.5 },
      { word: 'world', start: 118.6, end: 119 },
    ];
    const next = [
      { word: 'hello', start: 0.2, end: 0.5 },
      { word: 'world', start: 0.6, end: 1 },
      { word: 'again', start: 1.1, end: 1.4 },
    ];

    const deduped = deduplicateChunkWords(previous, next, 1.5);
    expect(deduped.map((word) => word.word)).toEqual(['again']);
  });

  it('concatenates multiple chunks into one transcript', () => {
    const result = concatenateChunkTranscripts([
      {
        overlapSecs: 0,
        words: [
          { word: 'one', start: 0, end: 0.5 },
          { word: 'two', start: 0.6, end: 1 },
        ],
      },
      {
        overlapSecs: 1.5,
        words: [
          { word: 'two', start: 0.2, end: 0.5 },
          { word: 'three', start: 0.6, end: 1 },
        ],
      },
    ]);

    expect(result.text).toBe('one two three');
    expect(result.words).toHaveLength(3);
  });

  it('returns empty text and words for empty chunks array', () => {
    const result = concatenateChunkTranscripts([]);
    expect(result.text).toBe('');
    expect(result.words).toEqual([]);
  });

  it('returns first chunk as-is when only one chunk is provided', () => {
    const result = concatenateChunkTranscripts([
      { overlapSecs: 0, words: [{ word: 'hello', start: 0, end: 0.5 }] },
    ]);
    expect(result.text).toBe('hello');
    expect(result.words).toHaveLength(1);
  });
});

describe('concatenateChunkTexts', () => {
  it('concatenates plain text chunks deduplicating overlapping words', () => {
    const result = concatenateChunkTexts([
      { transcriptText: 'one two three', overlapSecs: 1 },
      { transcriptText: 'three four five', overlapSecs: 1 },
    ]);
    expect(result).toContain('one');
    expect(result).toContain('five');
    // 'three' should appear only once after dedup
    expect(result.split('three')).toHaveLength(2);
  });

  it('returns empty string for empty input', () => {
    const result = concatenateChunkTexts([]);
    expect(result).toBe('');
  });

  it('uses provided words array when available instead of splitting text', () => {
    const result = concatenateChunkTexts([
      {
        transcriptText: 'ignored text',
        overlapSecs: 0,
        words: [{ word: 'actual', start: 0, end: 0.5 }],
      },
    ]);
    expect(result).toBe('actual');
  });

  it('handles single chunk with no overlap', () => {
    const result = concatenateChunkTexts([
      { transcriptText: 'hello world', overlapSecs: 0 },
    ]);
    expect(result).toBe('hello world');
  });
});
