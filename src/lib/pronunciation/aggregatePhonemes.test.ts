// Tests for phoneme pattern aggregation — identifying weak sounds across words

import { describe, it, expect } from 'vitest';
import { aggregatePhonemes } from './aggregatePhonemes';

function word(w: string, phonemes: Array<{ phoneme: string; accuracyScore: number }>) {
  return { word: w, phonemes };
}

describe('aggregatePhonemes', () => {
  it('returns empty array for empty input', () => {
    expect(aggregatePhonemes([])).toEqual([]);
  });

  it('returns empty array when all phonemes score above threshold', () => {
    const words = [
      word('hello', [
        { phoneme: 'hh', accuracyScore: 90 },
        { phoneme: 'eh', accuracyScore: 85 },
        { phoneme: 'l', accuracyScore: 95 },
        { phoneme: 'ow', accuracyScore: 80 },
      ]),
    ];
    expect(aggregatePhonemes(words)).toEqual([]);
  });

  it('identifies weak phonemes below threshold', () => {
    const words = [
      word('think', [
        { phoneme: 'th', accuracyScore: 40 },
        { phoneme: 'ih', accuracyScore: 90 },
        { phoneme: 'ng', accuracyScore: 50 },
        { phoneme: 'k', accuracyScore: 85 },
      ]),
    ];
    const result = aggregatePhonemes(words);
    expect(result).toHaveLength(2);
    expect(result[0]?.phoneme).toBe('th');
    expect(result[0]?.averageScore).toBe(40);
    expect(result[1]?.phoneme).toBe('ng');
  });

  it('averages scores across multiple words', () => {
    const words = [
      word('think', [{ phoneme: 'th', accuracyScore: 40 }]),
      word('three', [{ phoneme: 'th', accuracyScore: 60 }]),
      word('math', [{ phoneme: 'th', accuracyScore: 50 }]),
    ];
    const result = aggregatePhonemes(words);
    expect(result).toHaveLength(1);
    expect(result[0]?.averageScore).toBe(50);
    expect(result[0]?.exampleWords).toEqual(['think', 'three', 'math']);
  });

  it('maps SAPI codes to IPA symbols', () => {
    const words = [
      word('the', [{ phoneme: 'dh', accuracyScore: 30 }]),
    ];
    const result = aggregatePhonemes(words);
    expect(result[0]?.ipaSymbol).toBe('ð');
  });

  it('limits results to max 5 weak phonemes', () => {
    const phonemes = ['th', 'dh', 'zh', 'sh', 'ng', 'r', 'l'].map((p) => ({
      phoneme: p,
      accuracyScore: 30,
    }));
    const words = [word('test', phonemes)];
    const result = aggregatePhonemes(words);
    expect(result).toHaveLength(5);
  });

  it('sorts by lowest score first', () => {
    const words = [
      word('test', [
        { phoneme: 'th', accuracyScore: 60 },
        { phoneme: 'dh', accuracyScore: 20 },
        { phoneme: 'zh', accuracyScore: 40 },
      ]),
    ];
    const result = aggregatePhonemes(words);
    expect(result[0]?.phoneme).toBe('dh');
    expect(result[1]?.phoneme).toBe('zh');
    expect(result[2]?.phoneme).toBe('th');
  });

  it('handles invalid phonemes data gracefully', () => {
    const words = [
      { word: 'bad', phonemes: 'not-an-array' },
      { word: 'ok', phonemes: [{ phoneme: 'th', accuracyScore: 30 }] },
    ];
    const result = aggregatePhonemes(words);
    expect(result).toHaveLength(1);
    expect(result[0]?.phoneme).toBe('th');
  });

  it('deduplicates example words (case-insensitive)', () => {
    const words = [
      word('Think', [{ phoneme: 'th', accuracyScore: 40 }]),
      word('think', [{ phoneme: 'th', accuracyScore: 50 }]),
    ];
    const result = aggregatePhonemes(words);
    expect(result[0]?.exampleWords).toEqual(['think']);
  });

  it('caps example words at 3', () => {
    const words = [
      word('think', [{ phoneme: 'th', accuracyScore: 40 }]),
      word('three', [{ phoneme: 'th', accuracyScore: 50 }]),
      word('math', [{ phoneme: 'th', accuracyScore: 45 }]),
      word('bath', [{ phoneme: 'th', accuracyScore: 55 }]),
      word('cloth', [{ phoneme: 'th', accuracyScore: 35 }]),
    ];
    const result = aggregatePhonemes(words);
    expect(result[0]?.exampleWords).toHaveLength(3);
  });

  it('tracks occurrence count', () => {
    const words = [
      word('think', [{ phoneme: 'th', accuracyScore: 40 }]),
      word('three', [{ phoneme: 'th', accuracyScore: 50 }]),
    ];
    const result = aggregatePhonemes(words);
    expect(result[0]?.occurrences).toBe(2);
  });
});
