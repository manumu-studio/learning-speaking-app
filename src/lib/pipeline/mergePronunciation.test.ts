// Tests for parallel-pipeline pronunciation score merger
import { describe, expect, it } from 'vitest';
import { mergePronunciation } from './mergePronunciation';

const makeReport = (score: number, words: unknown[] = []) => ({
  pronScore: score,
  accuracyScore: score,
  fluencyScore: score,
  completenessScore: score,
  prosodyScore: score,
  words,
});

describe('mergePronunciation', () => {
  it('returns null for empty input', () => {
    expect(mergePronunciation([])).toBeNull();
  });

  it('returns null when all chunks have null pronunciationReport', () => {
    const chunks = [
      { chunkIndex: 0, durationSecs: 120, overlapSecs: 0, pronunciationReport: null },
    ];
    expect(mergePronunciation(chunks)).toBeNull();
  });

  it('returns single chunk scores unchanged (no averaging)', () => {
    const chunks = [
      {
        chunkIndex: 0,
        durationSecs: 120,
        overlapSecs: 0,
        pronunciationReport: makeReport(85),
      },
    ];
    const result = mergePronunciation(chunks);
    expect(result).not.toBeNull();
    expect(result?.pronScore).toBeCloseTo(85);
    expect(result?.accuracyScore).toBeCloseTo(85);
  });

  it('computes duration-weighted average across two chunks', () => {
    const chunks = [
      {
        chunkIndex: 0,
        durationSecs: 120,
        overlapSecs: 0,
        pronunciationReport: makeReport(80),
      },
      {
        chunkIndex: 1,
        durationSecs: 125,
        overlapSecs: 5,
        pronunciationReport: makeReport(90),
      },
    ];
    const result = mergePronunciation(chunks);
    expect(result).not.toBeNull();
    expect(result?.pronScore).toBeCloseTo(85);
  });

  it('skips chunks with invalid pronunciationReport JSON', () => {
    const chunks = [
      {
        chunkIndex: 0,
        durationSecs: 120,
        overlapSecs: 0,
        pronunciationReport: { invalid: true },
      },
      {
        chunkIndex: 1,
        durationSecs: 120,
        overlapSecs: 5,
        pronunciationReport: makeReport(75),
      },
    ];
    const result = mergePronunciation(chunks);
    expect(result).not.toBeNull();
    expect(result?.pronScore).toBeCloseTo(75);
  });

  it('trims overlap words from chunk 1 onwards', () => {
    const word = (w: string) => ({
      word: w,
      accuracyScore: 90,
      errorType: 'None',
      offsetMs: 0,
      durationMs: 300,
      phonemes: [],
      l1Tags: [],
      breakErrorTypes: [],
      intonationErrorTypes: [],
      monotonePitchDelta: null,
    });
    const chunk0Words = [word('hello'), word('world'), word('foo')];
    const chunk1Words = [word('hello'), word('world'), word('bar')];

    const chunks = [
      {
        chunkIndex: 0,
        durationSecs: 120,
        overlapSecs: 0,
        pronunciationReport: makeReport(80, chunk0Words),
      },
      {
        chunkIndex: 1,
        durationSecs: 125,
        overlapSecs: 5,
        pronunciationReport: makeReport(90, chunk1Words),
      },
    ];
    const result = mergePronunciation(chunks);
    expect(result?.words.length).toBe(3);
  });

  it('computes speakingRateWpm from valid words and effective duration', () => {
    const word = (w: string, errorType = 'None') => ({
      word: w,
      accuracyScore: 90,
      errorType,
      offsetMs: 0,
      durationMs: 500,
      phonemes: [],
      l1Tags: [],
      breakErrorTypes: [],
      intonationErrorTypes: [],
      monotonePitchDelta: null,
    });
    const words = [word('a'), word('b'), word('c', 'Insertion'), word('d')];
    const chunks = [
      {
        chunkIndex: 0,
        durationSecs: 60,
        overlapSecs: 0,
        pronunciationReport: makeReport(80, words),
      },
    ];
    const result = mergePronunciation(chunks);
    expect(result?.speakingRateWpm).toBeCloseTo(3);
  });
});
