// Unit tests for persistPronunciation — score mapping, WPM computation, and DB writes
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prismaMock } from '@/__mocks__/prisma';

vi.mock('@/lib/prisma', () => ({ prisma: prismaMock }));

import { persistPronunciation } from './persistPronunciation';
import type { PronunciationResult } from '@/lib/ai/azurePronunciation.types';

// ---------------------------------------------------------------------------
// Shared mock data
// ---------------------------------------------------------------------------

const makeResult = (overrides: Partial<PronunciationResult> = {}): PronunciationResult => ({
  pronScore: 70,
  accuracyScore: 75,
  fluencyScore: 80,
  completenessScore: 90,
  prosodyScore: 65,
  words: [
    {
      word: 'hello',
      accuracyScore: 85,
      errorType: 'None',
      offsetMs: 0,
      durationMs: 300,
      phonemes: [{ phoneme: 'h', accuracyScore: 90 }],
      l1Tags: ['b_for_v'],
    },
    {
      word: 'world',
      accuracyScore: 70,
      errorType: 'None',
      offsetMs: 400,
      durationMs: 400,
      phonemes: [],
      prosodyFeedback: {
        breakErrorTypes: ['UnexpectedBreak'],
        breakLengthMs: 200,
        intonationErrorTypes: ['Monotone'],
        monotoneSyllablePitchDeltaConfidence: 0.2,
      },
    },
  ],
  rawUtterances: [{ mock: 'utterance' }],
  ...overrides,
});

const MOCK_REPORT_ID = 'report-abc';

function setupTransactionMock(): void {
  // Execute the transaction callback immediately with prismaMock as the tx client
  prismaMock.$transaction.mockImplementation(
    (fn: unknown) => (fn as (tx: typeof prismaMock) => Promise<unknown>)(prismaMock),
  );
  prismaMock.pronunciationReport.upsert.mockResolvedValue({
    id: MOCK_REPORT_ID,
    sessionId: 'session-1',
  } as never);
  prismaMock.wordPronunciation.deleteMany.mockResolvedValue({ count: 0 } as never);
  prismaMock.wordPronunciation.createMany.mockResolvedValue({ count: 2 } as never);
  prismaMock.metricSnapshot.upsert.mockResolvedValue({} as never);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('persistPronunciation', () => {
  beforeEach(() => {
    setupTransactionMock();
  });

  it('upserts PronunciationReport with correct aggregate scores', async () => {
    await persistPronunciation('session-1', makeResult());

    expect(prismaMock.pronunciationReport.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { sessionId: 'session-1' },
        create: expect.objectContaining({
          sessionId: 'session-1',
          pronScore: 70,
          accuracyScore: 75,
          fluencyScore: 80,
          completenessScore: 90,
          prosodyScore: 65,
          azureSdkVersion: '1.42.0',
        }),
      }),
    );
  });

  it('deletes existing word rows before inserting (idempotent)', async () => {
    await persistPronunciation('session-1', makeResult());

    expect(prismaMock.wordPronunciation.deleteMany).toHaveBeenCalledWith({
      where: { reportId: MOCK_REPORT_ID },
    });
    const deleteOrder = prismaMock.wordPronunciation.deleteMany.mock.invocationCallOrder[0];
    const createOrder = prismaMock.wordPronunciation.createMany.mock.invocationCallOrder[0];
    expect(deleteOrder).toBeDefined();
    expect(createOrder).toBeDefined();
    expect(deleteOrder!).toBeLessThan(createOrder!);
  });

  it('maps word fields correctly including prosodyFeedback extraction', async () => {
    await persistPronunciation('session-1', makeResult());

    const callArgs = prismaMock.wordPronunciation.createMany.mock.calls[0]?.[0];
    const words = (callArgs as { data: unknown[] }).data;

    expect(words).toHaveLength(2);

    // Word 0: no prosodyFeedback — arrays default to []
    expect(words[0]).toMatchObject({
      reportId: MOCK_REPORT_ID,
      wordIndex: 0,
      word: 'hello',
      accuracyScore: 85,
      errorType: 'None',
      breakErrorTypes: [],
      intonationErrorTypes: [],
      monotonePitchDelta: null,
      l1Tags: ['b_for_v'],
    });

    // Word 1: prosodyFeedback present — fields extracted
    expect(words[1]).toMatchObject({
      wordIndex: 1,
      word: 'world',
      breakErrorTypes: ['UnexpectedBreak'],
      intonationErrorTypes: ['Monotone'],
      monotonePitchDelta: 0.2,
      l1Tags: [],
    });
  });

  it('upserts 3 MetricSnapshots (pronunciationAccuracy, prosodyScore, speakingRate)', async () => {
    await persistPronunciation('session-1', makeResult());

    const upsertCalls = prismaMock.metricSnapshot.upsert.mock.calls;
    expect(upsertCalls).toHaveLength(3);

    const keys = upsertCalls.map(([args]) => (args as { where: { sessionId_key: { key: string } } }).where.sessionId_key.key);
    expect(keys).toContain('pronunciationAccuracy');
    expect(keys).toContain('prosodyScore');
    expect(keys).toContain('speakingRate');
  });

  it('derives level from score — high accuracy maps to high level', async () => {
    // accuracyScore 90 → mapAzureScore(90) = 9 → scoreToLevel(9) = 'high'
    await persistPronunciation('session-1', makeResult({ accuracyScore: 90 }));

    const accuracyCall = prismaMock.metricSnapshot.upsert.mock.calls.find(
      ([args]) => (args as { where: { sessionId_key: { key: string } } }).where.sessionId_key.key === 'pronunciationAccuracy',
    );
    expect(accuracyCall).toBeDefined();
    const create = (accuracyCall![0] as { create: { level: string } }).create;
    expect(create.level).toBe('high');
  });

  it('derives level from score — low accuracy maps to low level', async () => {
    // accuracyScore 20 → mapAzureScore(20) = 2 → scoreToLevel(2) = 'low'
    await persistPronunciation('session-1', makeResult({ accuracyScore: 20 }));

    const accuracyCall = prismaMock.metricSnapshot.upsert.mock.calls.find(
      ([args]) => (args as { where: { sessionId_key: { key: string } } }).where.sessionId_key.key === 'pronunciationAccuracy',
    );
    const create = (accuracyCall![0] as { create: { level: string } }).create;
    expect(create.level).toBe('low');
  });

  it('computes speaking rate from valid words only — excludes Insertion and Omission', async () => {
    // 2 valid words × 500ms each = 1000ms total = 1/60 min → 120 WPM → score 9
    const result = makeResult({
      words: [
        { word: 'go', accuracyScore: 80, errorType: 'None', offsetMs: 0, durationMs: 500, phonemes: [] },
        { word: 'fast', accuracyScore: 80, errorType: 'None', offsetMs: 600, durationMs: 500, phonemes: [] },
        { word: 'extra', accuracyScore: 0, errorType: 'Insertion', offsetMs: 0, durationMs: 200, phonemes: [] },
        { word: 'skip', accuracyScore: 0, errorType: 'Omission', offsetMs: 0, durationMs: 0, phonemes: [] },
      ],
    });

    await persistPronunciation('session-1', result);

    const rateCall = prismaMock.metricSnapshot.upsert.mock.calls.find(
      ([args]) => (args as { where: { sessionId_key: { key: string } } }).where.sessionId_key.key === 'speakingRate',
    );
    // 2 valid words / (1000ms / 60000) = 120 WPM → score 9 → level 'high'
    const create = (rateCall![0] as { create: { score: number; level: string } }).create;
    expect(create.score).toBe(9);
    expect(create.level).toBe('high');
  });

  it('returns 0 WPM when all words are Omission — maps to score 1', async () => {
    const result = makeResult({
      words: [
        { word: 'nothing', accuracyScore: 0, errorType: 'Omission', offsetMs: 0, durationMs: 0, phonemes: [] },
      ],
    });

    await persistPronunciation('session-1', result);

    const rateCall = prismaMock.metricSnapshot.upsert.mock.calls.find(
      ([args]) => (args as { where: { sessionId_key: { key: string } } }).where.sessionId_key.key === 'speakingRate',
    );
    const create = (rateCall![0] as { create: { score: number } }).create;
    expect(create.score).toBe(1); // 0 WPM → mapSpeakingRate(0) = 1
  });

  it('computes speakingRateWpm and stores it on the report', async () => {
    // 2 words × 500ms = 120 WPM
    const result = makeResult({
      words: [
        { word: 'one', accuracyScore: 80, errorType: 'None', offsetMs: 0, durationMs: 500, phonemes: [] },
        { word: 'two', accuracyScore: 80, errorType: 'None', offsetMs: 600, durationMs: 500, phonemes: [] },
      ],
    });

    await persistPronunciation('session-1', result);

    const reportCreate = prismaMock.pronunciationReport.upsert.mock.calls[0]?.[0] as {
      create: { speakingRateWpm: number };
    };
    expect(reportCreate.create.speakingRateWpm).toBeCloseTo(120, 0);
  });
});
