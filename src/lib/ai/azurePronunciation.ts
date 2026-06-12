// Azure Speech SDK client for pronunciation assessment — wraps continuous recognition
// and post-processes results with client-side miscue detection via difflib
import * as sdk from 'microsoft-cognitiveservices-speech-sdk';
import { SequenceMatcher } from 'difflib';
import type { PronunciationResult, WordResult } from './azurePronunciation.types';
import { collectWordsFromEvent } from './azureSdkMappers';

function buildRecognizer(
  wavBuffer: Buffer,
  referenceText: string,
  azureKey: string,
  azureRegion: string,
): sdk.SpeechRecognizer {
  const speechConfig = sdk.SpeechConfig.fromSubscription(azureKey, azureRegion);
  speechConfig.speechRecognitionLanguage = 'en-US';
  const pushStream = sdk.AudioInputStream.createPushStream();
  const arrayBuffer = new ArrayBuffer(wavBuffer.byteLength);
  new Uint8Array(arrayBuffer).set(wavBuffer);
  pushStream.write(arrayBuffer);
  pushStream.close();
  const audioConfig = sdk.AudioConfig.fromStreamInput(pushStream);
  const pronunciationConfig = new sdk.PronunciationAssessmentConfig(
    referenceText,
    sdk.PronunciationAssessmentGradingSystem.HundredMark,
    sdk.PronunciationAssessmentGranularity.Phoneme,
    false,
  );
  pronunciationConfig.enableProsodyAssessment = true;
  pronunciationConfig.nbestPhonemeCount = 5;
  const recognizer = new sdk.SpeechRecognizer(speechConfig, audioConfig);
  pronunciationConfig.applyTo(recognizer);
  return recognizer;
}

/**
 * Runs Azure Speech SDK pronunciation assessment on a WAV audio buffer against a reference text.
 *
 * Uses continuous recognition with phoneme-granularity scoring, prosody assessment, and
 * 5-best phoneme alternatives. Client-side miscue detection (Insertion / Mispronunciation /
 * Omission tagging) is applied via `difflib.SequenceMatcher` after recognition completes.
 *
 * @param wavBuffer - PCM WAV audio buffer of the utterance to assess.
 * @param referenceText - The expected text the speaker was reading (used for miscue alignment).
 * @param azureKey - Azure Speech resource subscription key.
 * @param azureRegion - Azure Speech resource region (e.g. `'eastus'`).
 * @returns A `PronunciationResult` with per-word accuracy, phoneme details, and aggregate scores.
 */
export async function assessPronunciation(
  wavBuffer: Buffer,
  referenceText: string,
  azureKey: string,
  azureRegion: string,
): Promise<PronunciationResult> {
  const recognizer = buildRecognizer(wavBuffer, referenceText, azureKey, azureRegion);

  return new Promise<PronunciationResult>((resolve, reject) => {
    const utterances: unknown[] = [];
    const allWords: WordResult[] = [];

    recognizer.recognized = (_sender, event) => {
      const words = collectWordsFromEvent(event, utterances);
      allWords.push(...words);
    };

    recognizer.sessionStopped = () => {
      recognizer.stopContinuousRecognitionAsync(() => {
        recognizer.close();
        resolve(aggregateResults(allWords, utterances, referenceText));
      }, reject);
    };

    recognizer.canceled = (_sender, event) => {
      recognizer.stopContinuousRecognitionAsync(() => {
        recognizer.close();
        if (event.reason === sdk.CancellationReason.Error) {
          reject(new Error(`Azure Speech canceled: ${event.errorDetails}`));
        } else {
          resolve(aggregateResults(allWords, utterances, referenceText));
        }
      }, reject);
    };

    recognizer.startContinuousRecognitionAsync(
      () => { /* recognition started successfully */ },
      reject,
    );
  });
}

// ---------------------------------------------------------------------------
// Miscue detection helpers
// ---------------------------------------------------------------------------

function applyInsertionTags(taggedWords: WordResult[], j1: number, j2: number): void {
  for (let j = j1; j < j2; j++) {
    const existing = taggedWords[j];
    if (existing) taggedWords[j] = { ...existing, errorType: 'Insertion' };
  }
}

function applyMispronunciationTags(taggedWords: WordResult[], j1: number, j2: number): void {
  for (let j = j1; j < j2; j++) {
    const existing = taggedWords[j];
    if (existing?.errorType === 'None') {
      taggedWords[j] = { ...existing, errorType: 'Mispronunciation' };
    }
  }
}

function buildOmissions(refWords: string[], opcodes: [string, number, number, number, number][]): WordResult[] {
  const omissions: WordResult[] = [];
  for (const [tag, i1, i2] of opcodes) {
    if (tag !== 'delete') continue;
    for (let i = i1; i < i2; i++) {
      omissions.push({
        word: refWords[i] ?? '',
        accuracyScore: 0,
        errorType: 'Omission',
        offsetMs: 0,
        durationMs: 0,
        phonemes: [],
      });
    }
  }
  return omissions;
}

function applyMiscueTags(
  words: WordResult[],
  refWords: string[],
): { taggedWords: WordResult[]; omissions: WordResult[] } {
  const recWords = words.map((w) => w.word.toLowerCase());
  const matcher = new SequenceMatcher(null, refWords, recWords);
  const opcodes = matcher.getOpcodes() as [string, number, number, number, number][];
  const taggedWords: WordResult[] = words.map((w) => ({ ...w }));

  for (const [tag, , , j1, j2] of opcodes) {
    if (tag === 'insert') applyInsertionTags(taggedWords, j1, j2);
    if (tag === 'replace') applyMispronunciationTags(taggedWords, j1, j2);
  }

  return { taggedWords, omissions: buildOmissions(refWords, opcodes) };
}

// ---------------------------------------------------------------------------
// Score aggregation helpers
// ---------------------------------------------------------------------------

function computeProsodyScore(taggedWords: WordResult[]): number {
  const prosodyWords = taggedWords.filter((w) => w.prosodyFeedback !== undefined);
  if (prosodyWords.length === 0) return 50;
  const sum = prosodyWords.reduce((acc, w) => {
    const delta = w.prosodyFeedback?.monotoneSyllablePitchDeltaConfidence ?? 0.5;
    return acc + delta * 100;
  }, 0);
  return sum / prosodyWords.length;
}

function computeScores(
  taggedWords: WordResult[],
  refWords: string[],
): { accuracy: number; completeness: number; fluency: number; prosody: number } {
  const validWords = taggedWords.filter((w) => w.errorType !== 'Insertion');
  const accuracy =
    validWords.length > 0
      ? validWords.reduce((sum, w) => sum + w.accuracyScore, 0) / validWords.length
      : 0;
  const completeness =
    refWords.length > 0 ? Math.min(100, (validWords.length / refWords.length) * 100) : 0;
  const totalDurationMs = taggedWords.reduce((sum, w) => sum + w.durationMs, 0);
  const speechDurationMs = validWords.reduce((sum, w) => sum + w.durationMs, 0);
  const fluency = totalDurationMs > 0 ? Math.min(100, (speechDurationMs / totalDurationMs) * 100) : 0;
  const prosody = computeProsodyScore(taggedWords);
  return { accuracy, completeness, fluency, prosody };
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function aggregateResults(
  words: WordResult[],
  rawUtterances: unknown[],
  referenceText: string,
): PronunciationResult {
  const refWords = referenceText.toLowerCase().split(/\s+/).filter(Boolean);
  const { taggedWords, omissions } = applyMiscueTags(words, refWords);
  const { accuracy, completeness, fluency, prosody } = computeScores(taggedWords, refWords);
  const worst = Math.min(accuracy, fluency, completeness, prosody);
  const pronScore = worst * 0.4 + accuracy * 0.15 + fluency * 0.15 + completeness * 0.15 + prosody * 0.15;

  return {
    pronScore: round1(pronScore),
    accuracyScore: round1(accuracy),
    fluencyScore: round1(fluency),
    completenessScore: round1(completeness),
    prosodyScore: round1(prosody),
    words: [...taggedWords, ...omissions],
    rawUtterances,
  };
}
