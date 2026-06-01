// Tests for pipelineHelpers — covers buildPronunciationSummary, runAzurePronunciation, and estimateCefrAndPersist
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prismaMock } from '@/__mocks__/prisma';
import { Prisma } from '@prisma/client';
import type { PronunciationResult, WordResult } from '@/lib/ai/azurePronunciation.types';
import type { MetricScoreInput } from '@/lib/cefr/cefr.types';

vi.mock('@/lib/prisma', () => ({ prisma: prismaMock }));

vi.mock('@/lib/ai/azurePronunciation', () => ({
  assessPronunciation: vi.fn(),
}));

vi.mock('@/lib/ai/l1Spanish', () => ({
  tagSpanishL1: vi.fn((words: WordResult[]) => words),
}));

vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

vi.mock('@/lib/env', () => ({
  env: {
    AZURE_SPEECH_KEY: 'test-key',
    AZURE_SPEECH_REGION: 'eastus',
    NODE_ENV: 'test',
  },
}));

vi.mock('@/lib/pipeline/persistPronunciation', () => ({
  AZURE_SDK_VERSION: '1.0.0',
  persistPronunciation: vi.fn(),
}));

// Dynamic import mock for estimateCefr
vi.mock('@/lib/cefr/estimateCefr', () => ({
  estimateCefr: vi.fn(),
}));

import {
  buildPronunciationSummary,
  runAzurePronunciation,
  estimateCefrAndPersist,
} from '@/lib/pipeline/pipelineHelpers';
import { assessPronunciation } from '@/lib/ai/azurePronunciation';
import { tagSpanishL1 } from '@/lib/ai/l1Spanish';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeWord(overrides: Partial<WordResult> = {}): WordResult {
  return {
    word: 'hello',
    accuracyScore: 80,
    errorType: 'None',
    offsetMs: 0,
    durationMs: 200,
    phonemes: [],
    ...overrides,
  };
}

function makePronunciationResult(
  overrides: Partial<PronunciationResult> = {},
): PronunciationResult {
  return {
    pronScore: 75,
    accuracyScore: 80,
    fluencyScore: 70,
    completenessScore: 90,
    prosodyScore: 65,
    words: [],
    rawUtterances: [],
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// buildPronunciationSummary
// ---------------------------------------------------------------------------

describe('buildPronunciationSummary', () => {
  it('returns null when result is null', () => {
    expect(buildPronunciationSummary(null)).toBeNull();
  });

  it('returns summary with empty arrays when no words', () => {
    const result = makePronunciationResult({ words: [] });
    const summary = buildPronunciationSummary(result);
    expect(summary).toEqual({
      topWeakPhonemes: [],
      l1Tags: [],
      accuracyScore: 80,
      prosodyScore: 65,
    });
  });

  it('filters phonemes with accuracyScore < 60 and maps to phoneme string', () => {
    const words = [
      makeWord({
        phonemes: [
          { phoneme: 'θ', accuracyScore: 45 },
          { phoneme: 'r', accuracyScore: 72 },
          { phoneme: 'v', accuracyScore: 30 },
        ],
      }),
    ];
    const result = makePronunciationResult({ words });
    const summary = buildPronunciationSummary(result);
    expect(summary?.topWeakPhonemes).toEqual(['θ', 'v']);
  });

  it('includes phonemes at exactly 60 threshold (not weak)', () => {
    const words = [
      makeWord({
        phonemes: [
          { phoneme: 'ð', accuracyScore: 60 },
          { phoneme: 'ʃ', accuracyScore: 59 },
        ],
      }),
    ];
    const result = makePronunciationResult({ words });
    const summary = buildPronunciationSummary(result);
    // score=60 is NOT < 60, so excluded; score=59 IS < 60, included
    expect(summary?.topWeakPhonemes).toEqual(['ʃ']);
  });

  it('caps weak phonemes at 5', () => {
    const phonemes = [
      { phoneme: 'a', accuracyScore: 10 },
      { phoneme: 'b', accuracyScore: 20 },
      { phoneme: 'c', accuracyScore: 30 },
      { phoneme: 'd', accuracyScore: 40 },
      { phoneme: 'e', accuracyScore: 50 },
      { phoneme: 'f', accuracyScore: 55 },
    ];
    const words = [makeWord({ phonemes })];
    const result = makePronunciationResult({ words });
    const summary = buildPronunciationSummary(result);
    expect(summary?.topWeakPhonemes).toHaveLength(5);
    expect(summary?.topWeakPhonemes).toEqual(['a', 'b', 'c', 'd', 'e']);
  });

  it('collects l1Tags from all words and deduplicates them', () => {
    const words = [
      makeWord({ l1Tags: ['b_v_confusion', 'th_substitution'] }),
      makeWord({ l1Tags: ['b_v_confusion', 'r_trill'] }),
      makeWord(), // no l1Tags property
    ];
    const result = makePronunciationResult({ words });
    const summary = buildPronunciationSummary(result);
    expect(summary?.l1Tags).toEqual(
      expect.arrayContaining(['b_v_confusion', 'th_substitution', 'r_trill']),
    );
    expect(summary?.l1Tags).toHaveLength(3);
  });

  it('returns empty l1Tags when no words have l1Tags', () => {
    // omitting l1Tags entirely (optional field) — no l1Tags property at all
    const wordNoTags = makeWord();
    const wordEmptyTags = makeWord({ l1Tags: [] });
    const result = makePronunciationResult({ words: [wordNoTags, wordEmptyTags] });
    const summary = buildPronunciationSummary(result);
    expect(summary?.l1Tags).toEqual([]);
  });

  it('includes accuracyScore and prosodyScore from result', () => {
    const result = makePronunciationResult({ accuracyScore: 92, prosodyScore: 78 });
    const summary = buildPronunciationSummary(result);
    expect(summary?.accuracyScore).toBe(92);
    expect(summary?.prosodyScore).toBe(78);
  });
});

// ---------------------------------------------------------------------------
// runAzurePronunciation
// ---------------------------------------------------------------------------

describe('runAzurePronunciation', () => {
  const baseCtx = {
    sessionId: 'session-123',
    userId: 'user-456',
    pcmBuffer: Buffer.from('pcm'),
    transcript: 'hello world',
    azureKey: 'key',
    azureRegion: 'eastus',
  };

  beforeEach(() => {
    vi.mocked(assessPronunciation).mockReset();
    vi.mocked(tagSpanishL1).mockImplementation((words: WordResult[]) => words);
  });

  it('returns tagged result on success', async () => {
    const azureResult = makePronunciationResult({
      words: [makeWord({ word: 'hello' })],
    });
    vi.mocked(assessPronunciation).mockResolvedValue(azureResult);

    const result = await runAzurePronunciation(baseCtx);

    expect(assessPronunciation).toHaveBeenCalledWith(
      baseCtx.pcmBuffer,
      baseCtx.transcript,
      baseCtx.azureKey,
      baseCtx.azureRegion,
    );
    expect(tagSpanishL1).toHaveBeenCalledWith(azureResult.words);
    expect(result).not.toBeNull();
    expect(result?.pronScore).toBe(75);
  });

  it('spreads azure result and applies l1 tags', async () => {
    const tagged = [makeWord({ word: 'world', l1Tags: ['r_trill'] })];
    const azureResult = makePronunciationResult({ words: [] });
    vi.mocked(assessPronunciation).mockResolvedValue(azureResult);
    vi.mocked(tagSpanishL1).mockReturnValue(tagged);

    const result = await runAzurePronunciation(baseCtx);
    expect(result?.words).toEqual(tagged);
    // other fields preserved
    expect(result?.accuracyScore).toBe(azureResult.accuracyScore);
  });

  it('returns null and persists failure report when Azure throws Error', async () => {
    vi.mocked(assessPronunciation).mockRejectedValue(new Error('Network timeout'));
    prismaMock.pronunciationReport.upsert.mockResolvedValue({} as never);

    const result = await runAzurePronunciation(baseCtx);

    expect(result).toBeNull();
    expect(prismaMock.pronunciationReport.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { sessionId: 'session-123' },
        create: expect.objectContaining({
          sessionId: 'session-123',
          pronScore: 0,
          accuracyScore: 0,
          fluencyScore: 0,
          completenessScore: 0,
          prosodyScore: 0,
          speakingRateWpm: 0,
          rawJson: Prisma.JsonNull,
          failureReason: 'Network timeout',
        }),
        update: { failureReason: 'Network timeout' },
      }),
    );
  });

  it('returns null and uses "Unknown error" when Azure throws non-Error', async () => {
    vi.mocked(assessPronunciation).mockRejectedValue('some string error');
    prismaMock.pronunciationReport.upsert.mockResolvedValue({} as never);

    const result = await runAzurePronunciation(baseCtx);

    expect(result).toBeNull();
    expect(prismaMock.pronunciationReport.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({ failureReason: 'Unknown error' }),
        update: { failureReason: 'Unknown error' },
      }),
    );
  });
});

// ---------------------------------------------------------------------------
// estimateCefrAndPersist
// ---------------------------------------------------------------------------

describe('estimateCefrAndPersist', () => {
  const userId = 'user-789';

  beforeEach(async () => {
    const { estimateCefr } = await import('@/lib/cefr/estimateCefr');
    vi.mocked(estimateCefr).mockReset();
  });

  it('returns immediately when metrics array is empty', async () => {
    await estimateCefrAndPersist(userId, []);
    expect(prismaMock.user.update).not.toHaveBeenCalled();
  });

  it('returns without DB call when estimateCefr returns null', async () => {
    const { estimateCefr } = await import('@/lib/cefr/estimateCefr');
    vi.mocked(estimateCefr).mockReturnValue(null);

    const metrics: MetricScoreInput[] = [{ key: 'verbAccuracy', score: 7 }];
    await estimateCefrAndPersist(userId, metrics);

    expect(prismaMock.user.update).not.toHaveBeenCalled();
  });

  it('persists CEFR level when estimate is valid', async () => {
    const { estimateCefr } = await import('@/lib/cefr/estimateCefr');
    vi.mocked(estimateCefr).mockReturnValue({
      level: 'c1-high',
      weightedAverage: 7.5,
      pillarBreakdown: { delivery: 7.5, language: 7.5, pronunciation: 7.5 },
    });
    prismaMock.user.update.mockResolvedValue({} as never);

    const metrics: MetricScoreInput[] = [
      { key: 'verbAccuracy', score: 8 },
      { key: 'connectorRepetition', score: 7 },
    ];
    await estimateCefrAndPersist(userId, metrics);

    expect(prismaMock.user.update).toHaveBeenCalledWith({
      where: { id: userId },
      data: { estimatedCefrLevel: 'c1-high' },
    });
  });

  it('passes the metrics array to estimateCefr', async () => {
    const { estimateCefr } = await import('@/lib/cefr/estimateCefr');
    vi.mocked(estimateCefr).mockReturnValue(null);

    const metrics: MetricScoreInput[] = [
      { key: 'pronunciationAccuracy', score: 9 },
      { key: 'prosodyScore', score: 8 },
    ];
    await estimateCefrAndPersist(userId, metrics);

    expect(estimateCefr).toHaveBeenCalledWith(metrics);
  });

  it('persists c2 level correctly', async () => {
    const { estimateCefr } = await import('@/lib/cefr/estimateCefr');
    vi.mocked(estimateCefr).mockReturnValue({
      level: 'c2',
      weightedAverage: 9.0,
      pillarBreakdown: { delivery: 9.0, language: 9.0, pronunciation: 9.0 },
    });
    prismaMock.user.update.mockResolvedValue({} as never);

    const metrics: MetricScoreInput[] = [
      { key: 'verbAccuracy', score: 9 },
      { key: 'pronunciationAccuracy', score: 9 },
    ];
    await estimateCefrAndPersist(userId, metrics);

    expect(prismaMock.user.update).toHaveBeenCalledWith({
      where: { id: userId },
      data: { estimatedCefrLevel: 'c2' },
    });
  });
});
