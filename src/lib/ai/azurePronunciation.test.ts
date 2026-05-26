// Integration tests for the Azure Speech SDK pronunciation assessment client
// Skips automatically when AZURE_SPEECH_KEY is not set in the environment
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { describe, it, expect, beforeAll } from 'vitest';
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
