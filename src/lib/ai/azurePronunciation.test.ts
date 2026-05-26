// Integration tests for the Azure Speech SDK pronunciation assessment client
// Skips automatically when AZURE_SPEECH_KEY is not set in the environment
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { toPcm16kMonoWav } from '@/lib/audio';
import { assessPronunciation } from './azurePronunciation';

const AZURE_KEY = process.env['AZURE_SPEECH_KEY'];
const AZURE_REGION = process.env['AZURE_SPEECH_REGION'] ?? 'eastus';

// Reference text used when generating the audio fixture
const REFERENCE_TEXT =
  'The quick brown fox jumps over the lazy dog near the river bank.';

const FIXTURE_WEBM = path.join(
  __dirname,
  '../audio/__fixtures__/sample.webm',
);

describe.skipIf(!AZURE_KEY)('assessPronunciation (live Azure integration)', () => {
  let wavBuffer: Buffer;
  // Narrowed inside skipIf — guaranteed defined when the describe body runs
  const key = AZURE_KEY ?? '';

  beforeAll(async () => {
    if (!existsSync(FIXTURE_WEBM)) {
      throw new Error(
        `Audio fixture not found at ${FIXTURE_WEBM}. Generate the sample.webm fixture first.`,
      );
    }
    const webmBuffer = readFileSync(FIXTURE_WEBM);
    wavBuffer = await toPcm16kMonoWav(webmBuffer);
  }, 30_000); // 30s timeout for ffmpeg transcode

  it(
    'returns a result with all scores in [0, 100]',
    async () => {
      const result = await assessPronunciation(
        wavBuffer,
        REFERENCE_TEXT,
        key,
        AZURE_REGION,
      );

      expect(result.pronScore).toBeGreaterThanOrEqual(0);
      expect(result.pronScore).toBeLessThanOrEqual(100);
      expect(result.accuracyScore).toBeGreaterThanOrEqual(0);
      expect(result.accuracyScore).toBeLessThanOrEqual(100);
      expect(result.fluencyScore).toBeGreaterThanOrEqual(0);
      expect(result.fluencyScore).toBeLessThanOrEqual(100);
      expect(result.completenessScore).toBeGreaterThanOrEqual(0);
      expect(result.completenessScore).toBeLessThanOrEqual(100);
      expect(result.prosodyScore).toBeGreaterThanOrEqual(0);
      expect(result.prosodyScore).toBeLessThanOrEqual(100);
    },
    60_000,
  );

  it(
    'returns a word count within 15% of the reference word count',
    async () => {
      const result = await assessPronunciation(
        wavBuffer,
        REFERENCE_TEXT,
        key,
        AZURE_REGION,
      );

      const refWordCount = REFERENCE_TEXT.split(/\s+/).filter(Boolean).length;
      const recognizedWordCount = result.words.filter(
        (w) => w.errorType !== 'Omission',
      ).length;

      // Allow 15% variance to account for natural speech variation
      const tolerance = Math.ceil(refWordCount * 0.15);
      expect(recognizedWordCount).toBeGreaterThan(refWordCount - tolerance);
      expect(recognizedWordCount).toBeLessThan(refWordCount + tolerance);
    },
    60_000,
  );

  it(
    'returns at least one word with a non-empty phonemes array',
    async () => {
      const result = await assessPronunciation(
        wavBuffer,
        REFERENCE_TEXT,
        key,
        AZURE_REGION,
      );

      const wordsWithPhonemes = result.words.filter(
        (w) => w.phonemes.length > 0,
      );
      expect(wordsWithPhonemes.length).toBeGreaterThan(0);
    },
    60_000,
  );

  it(
    'prosodyScore is greater than 0 for real speech',
    async () => {
      const result = await assessPronunciation(
        wavBuffer,
        REFERENCE_TEXT,
        key,
        AZURE_REGION,
      );

      // Silent fixture will produce default prosody=50; real speech should differ
      expect(result.prosodyScore).toBeGreaterThan(0);
    },
    60_000,
  );
});

// ---------------------------------------------------------------------------
// Unit tests — mocked SDK, exercises assessPronunciation + aggregateResults
// ---------------------------------------------------------------------------

describe('assessPronunciation (unit — mocked SDK)', () => {
  afterEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
  });

  const RECOGNIZED_SPEECH = 3;
  const CANCEL_ERROR = 1;

  interface MockOptions {
    words?: Record<string, unknown>[];
    fireRecognized?: boolean;
    cancelWithError?: boolean;
    cancelNoError?: boolean;
  }

  function makeSdkWord(overrides: Record<string, unknown> = {}): Record<string, unknown> {
    return {
      Word: 'hello',
      Offset: 10_000_000,
      Duration: 5_000_000,
      Phonemes: [
        {
          Phoneme: 'h',
          PronunciationAssessment: { AccuracyScore: 95 },
        },
      ],
      PronunciationAssessment: {
        AccuracyScore: 90,
        ErrorType: 'None',
      },
      ...overrides,
    };
  }

  async function setup(opts: MockOptions = {}) {
    vi.resetModules();
    const {
      words = [],
      fireRecognized = true,
      cancelWithError = false,
      cancelNoError = false,
    } = opts;

    const rec: Record<string, unknown> = {
      recognized: null,
      sessionStopped: null,
      canceled: null,
      close: vi.fn(),
      stopContinuousRecognitionAsync: vi.fn(
        (cb: () => void) => cb(),
      ),
      startContinuousRecognitionAsync: vi.fn(
        (onStarted: () => void) => {
          onStarted();
          queueMicrotask(() => {
            if (fireRecognized && typeof rec['recognized'] === 'function') {
              (rec['recognized'] as (s: unknown, e: unknown) => void)(null, {
                result: { reason: RECOGNIZED_SPEECH },
              });
            }
            queueMicrotask(() => {
              if (cancelWithError && typeof rec['canceled'] === 'function') {
                (rec['canceled'] as (s: unknown, e: unknown) => void)(null, {
                  reason: CANCEL_ERROR,
                  errorDetails: 'Mock cancellation error',
                });
              } else if (cancelNoError && typeof rec['canceled'] === 'function') {
                (rec['canceled'] as (s: unknown, e: unknown) => void)(null, {
                  reason: 99,
                  errorDetails: '',
                });
              } else if (typeof rec['sessionStopped'] === 'function') {
                (rec['sessionStopped'] as () => void)();
              }
            });
          });
        },
      ),
    };

    vi.doMock('microsoft-cognitiveservices-speech-sdk', () => ({
      SpeechConfig: {
        fromSubscription: vi.fn(() => ({ speechRecognitionLanguage: '' })),
      },
      AudioInputStream: {
        createPushStream: vi.fn(() => ({ write: vi.fn(), close: vi.fn() })),
      },
      AudioConfig: {
        fromStreamInput: vi.fn(() => ({})),
      },
      PronunciationAssessmentConfig: vi.fn().mockImplementation(() => ({
        enableProsodyAssessment: false,
        nbestPhonemeCount: 0,
        applyTo: vi.fn(),
      })),
      PronunciationAssessmentGradingSystem: { HundredMark: 1 },
      PronunciationAssessmentGranularity: { Phoneme: 2 },
      SpeechRecognizer: vi.fn().mockImplementation(() => rec),
      PronunciationAssessmentResult: {
        fromResult: vi.fn(() => ({
          detailResult: { Words: words },
        })),
      },
      ResultReason: { RecognizedSpeech: RECOGNIZED_SPEECH },
      CancellationReason: { Error: CANCEL_ERROR },
    }));

    const mod = await import('./azurePronunciation');
    return mod.assessPronunciation;
  }

  it('returns all scores in [0, 100] for a matched utterance', async () => {
    const assess = await setup({
      words: [
        makeSdkWord({ Word: 'hello' }),
        makeSdkWord({ Word: 'world' }),
      ],
    });
    const result = await assess(Buffer.from('fake'), 'hello world', 'k', 'r');
    for (const key of [
      'pronScore', 'accuracyScore', 'fluencyScore',
      'completenessScore', 'prosodyScore',
    ] as const) {
      expect(result[key]).toBeGreaterThanOrEqual(0);
      expect(result[key]).toBeLessThanOrEqual(100);
    }
  });

  it('detects insertions when extra words are spoken', async () => {
    const assess = await setup({
      words: [
        makeSdkWord({ Word: 'hello' }),
        makeSdkWord({ Word: 'extra' }),
      ],
    });
    const result = await assess(Buffer.from('fake'), 'hello', 'k', 'r');
    const insertion = result.words.find((w) => w.errorType === 'Insertion');
    expect(insertion).toBeDefined();
    expect(insertion?.word).toBe('extra');
  });

  it('detects omissions when reference words are missing', async () => {
    const assess = await setup({
      words: [makeSdkWord({ Word: 'hello' })],
    });
    const result = await assess(Buffer.from('fake'), 'hello world', 'k', 'r');
    const omission = result.words.find((w) => w.errorType === 'Omission');
    expect(omission).toBeDefined();
    expect(omission?.word).toBe('world');
  });

  it('tags replacements as Mispronunciation', async () => {
    const assess = await setup({
      words: [makeSdkWord({ Word: 'hallo' })],
    });
    const result = await assess(Buffer.from('fake'), 'hello', 'k', 'r');
    const misp = result.words.find((w) => w.errorType === 'Mispronunciation');
    expect(misp).toBeDefined();
  });

  it('rejects on cancellation with error', async () => {
    const assess = await setup({ cancelWithError: true, fireRecognized: false });
    await expect(
      assess(Buffer.from('fake'), 'hello', 'k', 'r'),
    ).rejects.toThrow(/Mock cancellation error/);
  });

  it('resolves on cancellation without error', async () => {
    const assess = await setup({ cancelNoError: true, fireRecognized: false });
    const result = await assess(Buffer.from('fake'), 'hello', 'k', 'r');
    expect(result.pronScore).toBeGreaterThanOrEqual(0);
    expect(result.pronScore).toBeLessThanOrEqual(100);
  });

  it('skips non-RecognizedSpeech events and produces omissions', async () => {
    const assess = await setup({ fireRecognized: false });
    const result = await assess(Buffer.from('fake'), 'hello', 'k', 'r');
    expect(result.words).toHaveLength(1);
    expect(result.words[0]?.errorType).toBe('Omission');
  });

  it('includes prosody feedback when present in SDK response', async () => {
    const assess = await setup({
      words: [
        makeSdkWord({
          Word: 'hello',
          PronunciationAssessment: {
            AccuracyScore: 90,
            ErrorType: 'None',
            Feedback: {
              Prosody: {
                Break: { ErrorTypes: ['UnexpectedBreak'], BreakLength: 200 },
                Intonation: {
                  ErrorTypes: ['Monotone'],
                  MonotoneSyllablePitchDeltaConfidence: 0.8,
                },
              },
            },
          },
        }),
      ],
    });
    const result = await assess(Buffer.from('fake'), 'hello', 'k', 'r');
    const word = result.words.find((w) => w.word === 'hello');
    expect(word?.prosodyFeedback).toBeDefined();
    expect(word?.prosodyFeedback?.breakErrorTypes).toEqual(['UnexpectedBreak']);
    expect(word?.prosodyFeedback?.breakLengthMs).toBe(200);
    expect(word?.prosodyFeedback?.intonationErrorTypes).toEqual(['Monotone']);
    expect(word?.prosodyFeedback?.monotoneSyllablePitchDeltaConfidence).toBe(0.8);
  });

  it('uses 0.5 prosody delta default when confidence is absent', async () => {
    const assess = await setup({
      words: [
        makeSdkWord({
          Word: 'hello',
          PronunciationAssessment: {
            AccuracyScore: 90,
            ErrorType: 'None',
            Feedback: {
              Prosody: {
                Break: {},
                Intonation: { ErrorTypes: [] },
              },
            },
          },
        }),
      ],
    });
    const result = await assess(Buffer.from('fake'), 'hello', 'k', 'r');
    expect(result.prosodyScore).toBe(50);
  });

  it('returns neutral prosody score of 50 when no prosody data', async () => {
    const assess = await setup({
      words: [makeSdkWord({ Word: 'hello' })],
    });
    const result = await assess(Buffer.from('fake'), 'hello', 'k', 'r');
    expect(result.prosodyScore).toBe(50);
  });

  it('falls back to None for unknown error types', async () => {
    const assess = await setup({
      words: [
        makeSdkWord({
          Word: 'hello',
          PronunciationAssessment: { AccuracyScore: 90, ErrorType: 'BogusType' },
        }),
      ],
    });
    const result = await assess(Buffer.from('fake'), 'hello', 'k', 'r');
    const word = result.words.find((w) => w.word === 'hello');
    expect(word?.errorType).toBe('None');
  });

  it('handles empty recognition with zero accuracy', async () => {
    const assess = await setup({ words: [] });
    const result = await assess(Buffer.from('fake'), '', 'k', 'r');
    expect(result.words).toHaveLength(0);
    expect(result.accuracyScore).toBe(0);
    expect(result.fluencyScore).toBe(0);
    expect(result.completenessScore).toBe(0);
  });

  it('parses nBest phonemes from SDK response', async () => {
    const assess = await setup({
      words: [
        makeSdkWord({
          Word: 'hello',
          Phonemes: [
            {
              Phoneme: 'h',
              PronunciationAssessment: {
                AccuracyScore: 95,
                NBestPhonemes: [
                  { Phoneme: 'h', Score: 95 },
                  { Phoneme: 'x', Score: 3 },
                ],
              },
            },
          ],
        }),
      ],
    });
    const result = await assess(Buffer.from('fake'), 'hello', 'k', 'r');
    const word = result.words.find((w) => w.word === 'hello');
    expect(word?.phonemes[0]?.nBest).toHaveLength(2);
    expect(word?.phonemes[0]?.nBest?.[0]?.phoneme).toBe('h');
  });

  it('converts SDK 100ns-tick offsets to milliseconds', async () => {
    const assess = await setup({
      words: [
        makeSdkWord({ Word: 'hello', Offset: 20_000_000, Duration: 5_000_000 }),
      ],
    });
    const result = await assess(Buffer.from('fake'), 'hello', 'k', 'r');
    const word = result.words.find((w) => w.word === 'hello');
    expect(word?.offsetMs).toBe(2000);
    expect(word?.durationMs).toBe(500);
  });
});
