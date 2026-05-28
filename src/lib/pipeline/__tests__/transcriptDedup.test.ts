// Unit tests for transcript overlap deduplication at chunk boundaries
import { describe, expect, it } from 'vitest';
import {
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
});
