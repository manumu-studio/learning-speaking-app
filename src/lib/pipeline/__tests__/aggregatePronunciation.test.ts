// Unit tests for weighted pronunciation aggregation across chunked recordings
import { describe, expect, it } from 'vitest';
import {
  aggregatePronunciation,
  toPronunciationResult,
} from '@/lib/pipeline/aggregatePronunciation';
import type {
  AggregatedPronunciation,
  ChunkPronunciationInput,
} from '@/lib/pipeline/aggregatePronunciation';
import type { WordResult } from '@/lib/ai/azurePronunciation.types';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const baseWord = (word: string, offsetMs = 0): WordResult => ({
  word,
  accuracyScore: 90,
  errorType: 'None',
  offsetMs,
  durationMs: 500,
  phonemes: [],
  l1Tags: [],
});

const baseChunk = (
  overrides: Partial<ChunkPronunciationInput> = {},
): ChunkPronunciationInput => ({
  chunkIndex: 0,
  durationSecs: 60,
  overlapSecs: 0,
  pronScore: 80,
  accuracyScore: 80,
  fluencyScore: 75,
  completenessScore: 85,
  prosodyScore: 70,
  speakingRateWpm: 130,
  pronWords: null,
  pronRawJson: null,
  ...overrides,
});

// ---------------------------------------------------------------------------
// aggregatePronunciation
// ---------------------------------------------------------------------------

describe('aggregatePronunciation', () => {
  it('returns null for an empty chunks array', () => {
    expect(aggregatePronunciation([])).toBeNull();
  });

  it('returns null when all chunks have null scores', () => {
    const nullChunk = baseChunk({
      pronScore: null,
      accuracyScore: null,
      fluencyScore: null,
      completenessScore: null,
      prosodyScore: null,
    });
    expect(aggregatePronunciation([nullChunk])).toBeNull();
  });

  it('passes single-chunk scores through without modification', () => {
    const chunk = baseChunk({ pronWords: [baseWord('hello')] });
    const result = aggregatePronunciation([chunk]);

    expect(result).not.toBeNull();
    expect(result?.pronScore).toBe(80);
    expect(result?.accuracyScore).toBe(80);
    expect(result?.fluencyScore).toBe(75);
    expect(result?.completenessScore).toBe(85);
    expect(result?.prosodyScore).toBe(70);
    expect(result?.speakingRateWpm).toBe(130);
    expect(result?.words).toHaveLength(1);
    expect(result?.words[0]?.word).toBe('hello');
  });

  it('weights averages by (durationSecs - overlapSecs) and longer chunk dominates', () => {
    // Chunk A: 60s effective weight, pronScore 80
    // Chunk B: 10s effective weight (20s duration – 10s overlap), pronScore 40
    // Weighted avg: (80*60 + 40*10) / (60+10) = (4800+400)/70 ≈ 74.28
    const chunkA = baseChunk({ durationSecs: 60, overlapSecs: 0, pronScore: 80 });
    const chunkB = baseChunk({
      chunkIndex: 1,
      durationSecs: 20,
      overlapSecs: 10,
      pronScore: 40,
    });

    const result = aggregatePronunciation([chunkA, chunkB]);

    expect(result?.pronScore).toBeCloseTo((80 * 60 + 40 * 10) / 70, 5);
    expect(result?.pronScore).toBeGreaterThan(40);
    expect(result?.pronScore).toBeLessThan(80);
  });

  it('re-indexes word offsets by accumulated chunk duration', () => {
    // Chunk A: 10s, no overlap → adds 10_000 ms to next chunk's base
    // Chunk B: word at offsetMs 200 → becomes 10_000 + 200 = 10_200
    const chunkA = baseChunk({
      durationSecs: 10,
      overlapSecs: 0,
      pronWords: [baseWord('first', 0)],
    });
    const chunkB = baseChunk({
      chunkIndex: 1,
      durationSecs: 10,
      overlapSecs: 0,
      pronWords: [baseWord('second', 200)],
    });

    const result = aggregatePronunciation([chunkA, chunkB]);

    expect(result?.words).toHaveLength(2);
    expect(result?.words[0]?.offsetMs).toBe(0);
    expect(result?.words[1]?.offsetMs).toBe(10_200);
  });

  it('merges rawUtterances from all chunks in order', () => {
    const chunkA = baseChunk({ pronRawJson: [{ chunk: 0 }] });
    const chunkB = baseChunk({ chunkIndex: 1, pronRawJson: [{ chunk: 1 }, { chunk: 1, extra: true }] });

    const result = aggregatePronunciation([chunkA, chunkB]);

    expect(result?.rawUtterances).toHaveLength(3);
    expect(result?.rawUtterances[0]).toStrictEqual({ chunk: 0 });
    expect(result?.rawUtterances[2]).toStrictEqual({ chunk: 1, extra: true });
  });

  it('skips null-scored chunks but still aggregates valid ones', () => {
    const goodChunk = baseChunk({ pronScore: 70, accuracyScore: 70, fluencyScore: 70, completenessScore: 70, prosodyScore: 70 });
    const badChunk = baseChunk({
      chunkIndex: 1,
      pronScore: null,
      accuracyScore: null,
      fluencyScore: null,
      completenessScore: null,
      prosodyScore: null,
    });

    const result = aggregatePronunciation([goodChunk, badChunk]);

    expect(result).not.toBeNull();
    expect(result?.pronScore).toBe(70);
  });
});

// ---------------------------------------------------------------------------
// toPronunciationResult
// ---------------------------------------------------------------------------

describe('toPronunciationResult', () => {
  it('maps AggregatedPronunciation to PronunciationResult without mutation', () => {
    const words: WordResult[] = [baseWord('test', 0)];
    const raw: unknown[] = [{ utterance: 1 }];

    const aggregated: AggregatedPronunciation = {
      pronScore: 88,
      accuracyScore: 87,
      fluencyScore: 86,
      completenessScore: 85,
      prosodyScore: 84,
      speakingRateWpm: 145,
      words,
      rawUtterances: raw,
    };

    const result = toPronunciationResult(aggregated);

    expect(result.pronScore).toBe(88);
    expect(result.accuracyScore).toBe(87);
    expect(result.fluencyScore).toBe(86);
    expect(result.completenessScore).toBe(85);
    expect(result.prosodyScore).toBe(84);
    expect(result.words).toBe(words);
    expect(result.rawUtterances).toBe(raw);
  });
});
