// Unit tests for persistPronunciation — score mapping, WPM computation, and DB writes
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prismaMock } from '@/__mocks__/prisma';

vi.mock('@/lib/prisma', () => ({ prisma: prismaMock }));

import { persistPronunciation, _mapAzureScore, _mapSpeakingRate } from './persistPronunciation';
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
    if (deleteOrder === undefined || createOrder === undefined) {
      throw new Error('expected both deleteMany and createMany to be called');
    }
    expect(deleteOrder).toBeLessThan(createOrder);
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
    if (accuracyCall === undefined) throw new Error('pronunciationAccuracy upsert not called');
    const create = (accuracyCall[0] as { create: { level: string } }).create;
    expect(create.level).toBe('high');
  });

  it('derives level from score — low accuracy maps to low level', async () => {
    // accuracyScore 20 → mapAzureScore(20) = 2 → scoreToLevel(2) = 'low'
    await persistPronunciation('session-1', makeResult({ accuracyScore: 20 }));

    const accuracyCall = prismaMock.metricSnapshot.upsert.mock.calls.find(
      ([args]) => (args as { where: { sessionId_key: { key: string } } }).where.sessionId_key.key === 'pronunciationAccuracy',
    );
    if (accuracyCall === undefined) throw new Error('pronunciationAccuracy upsert not called');
    const create = (accuracyCall[0] as { create: { level: string } }).create;
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
    if (rateCall === undefined) throw new Error('speakingRate upsert not called');
    const create = (rateCall[0] as { create: { score: number; level: string } }).create;
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
    if (rateCall === undefined) throw new Error('speakingRate upsert not called');
    const create = (rateCall[0] as { create: { score: number } }).create;
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

// ---------------------------------------------------------------------------
// mapSpeakingRate snapshot - regression lock on WPM-to-score mapping
// ---------------------------------------------------------------------------

describe('mapSpeakingRate snapshot - all WPM bands', () => {
  // Tests the exported _mapSpeakingRate directly — no DB mocks needed.
  // Bands derived from persistPronunciation.ts:
  //   110-140 -> 9 (optimal learner range)
  //   95-<110 or 140-160 -> 7
  //   80-<95 or 160-180 -> 5
  //   60-<80 -> 3
  //   >180 -> 4 (too fast but fluent)
  //   <60 or 0 -> 1 (very halting)

  it.each([
    [120, 9],  // midpoint of 110-140 band -> 9
    [110, 9],  // lower boundary of 9-band (inclusive) -> 9
    [140, 9],  // upper boundary of 9-band (inclusive) -> 9
    [100, 7],  // 95-<110 band -> 7
    [95, 7],   // lower boundary of 95-110 sub-band (inclusive) -> 7
    [150, 7],  // 140-160 band -> 7
    [160, 7],  // upper boundary of 140-160 band (inclusive) -> 7
    [85, 5],   // 80-<95 band -> 5
    [80, 5],   // lower boundary of 80-95 band (inclusive) -> 5
    [170, 5],  // 160-<180 band -> 5
    [180, 5],  // upper boundary of 160-180 band (inclusive) -> 5
    [70, 3],   // 60-<80 band -> 3
    [60, 3],   // lower boundary of 60-80 band (inclusive) -> 3
    [200, 4],  // >180 -> 4 (too fast, but fluent)
    [181, 4],  // smallest value >180 -> 4
    [0, 1],    // 0 WPM -> 1 (< 60)
    [50, 1],   // below 60 WPM -> 1
    [59, 1],   // just below 60 boundary -> 1
  ] as const)('WPM %i -> score %i', (wpm, expectedScore) => {
    expect(_mapSpeakingRate(wpm)).toBe(expectedScore);
  });
});

// ---------------------------------------------------------------------------
// mapAzureScore tolerance tests - 4-band piecewise curve
// ---------------------------------------------------------------------------

describe('mapAzureScore tolerance tests - pronunciationAccuracy + prosodyScore', () => {
  // 4-band non-linear curve (see persistPronunciation.ts):
  //   [0-40]   -> 1 + (x/40)*2          (output range 1.0-3.0)
  //   [40-60]  -> 3 + ((x-40)/20)*2     (output range 3.0-5.0)
  //   [60-80]  -> 6 + ((x-60)/20)*2     (output range 6.0-8.0, meaningful jump)
  //   [80-100] -> 8 + ((x-80)/20)*2     (output range 8.0-10.0)
  // All values after Math.round().

  it.each([
    [0, 1],    // floor of band 1 -> round(1.0) = 1
    [20, 2],   // midpoint band 1 -> round(1 + (20/40)*2) = round(2.0) = 2
    [40, 3],   // band 1/2 boundary -> round(1 + (40/40)*2) = round(3.0) = 3
    [50, 4],   // midpoint band 2 -> round(3 + (10/20)*2) = round(4.0) = 4
    [60, 5],   // band 2/3 boundary -> round(3 + (20/20)*2) = round(5.0) = 5
    [70, 7],   // midpoint band 3 -> round(6 + (10/20)*2) = round(7.0) = 7
    [80, 8],   // band 3/4 boundary -> round(6 + (20/20)*2) = round(8.0) = 8
    [90, 9],   // midpoint band 4 -> round(8 + (10/20)*2) = round(9.0) = 9
    [100, 10], // ceiling -> round(8 + (20/20)*2) = round(10.0) = 10
  ] as const)(
    'Azure %i -> app score %i (after Math.round)',
    (azureScore, expectedScore) => {
      expect(Math.round(_mapAzureScore(azureScore))).toBe(expectedScore);
    },
  );

  it('prosodyScore uses the same curve — Azure 80 maps to app score 8', () => {
    // Confirms both metrics share mapAzureScore; 80 sits at the band 3/4 boundary
    expect(Math.round(_mapAzureScore(80))).toBe(8);
  });

  it('band 3 (60-80) has a discontinuity at Azure 60 — score jumps from 5 to 6', () => {
    // Azure 59: 3 + ((59-40)/20)*2 = 3 + 1.9 = 4.9 -> rounds to 5
    // Azure 61: 6 + ((61-60)/20)*2 = 6 + 0.1 = 6.1 -> rounds to 6
    expect(Math.round(_mapAzureScore(59))).toBe(5);
    expect(Math.round(_mapAzureScore(61))).toBe(6);
  });

  it('band 2/3 boundary (Azure 60) maps to exactly 5 not 6', () => {
    // Azure 60 hits the `azureScore <= 60` branch: 3 + (20/20)*2 = 5.0 -> 5
    expect(Math.round(_mapAzureScore(60))).toBe(5);
  });
});
