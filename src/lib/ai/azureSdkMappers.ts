// Azure Speech SDK raw type definitions and mapper functions for pronunciation assessment
import type { SpeechRecognitionEventArgs } from 'microsoft-cognitiveservices-speech-sdk';
import * as sdk from 'microsoft-cognitiveservices-speech-sdk';
import type { WordResult, PhonemeResult, ProsodyFeedback, WordErrorType } from './azurePronunciation.types';
import { WORD_ERROR_TYPES } from './azurePronunciation.types';

// ---------------------------------------------------------------------------
// WordErrorType helpers
// ---------------------------------------------------------------------------

export function isWordErrorType(value: string): value is WordErrorType {
  return (WORD_ERROR_TYPES as readonly string[]).includes(value);
}

export function toWordErrorType(raw: string | undefined): WordErrorType {
  const candidate = raw ?? 'None';
  return isWordErrorType(candidate) ? candidate : 'None';
}

// ---------------------------------------------------------------------------
// Extended SDK word type — the SDK's DetailResult.Words interface omits many
// runtime-populated fields (Offset, Duration, Feedback) that appear in JSON.
// ---------------------------------------------------------------------------

export interface SdkNBestPhoneme {
  Phoneme?: string;
  Score?: number;
}

export interface SdkPhonemeDetail {
  Phoneme?: string;
  PronunciationAssessment?: {
    AccuracyScore?: number;
    NBestPhonemes?: SdkNBestPhoneme[];
  };
}

export interface SdkWordDetail {
  Word: string;
  Display?: string;
  Offset?: number;
  Duration?: number;
  Phonemes?: SdkPhonemeDetail[];
  PronunciationAssessment?: {
    AccuracyScore?: number;
    ErrorType?: string;
    Feedback?: {
      Prosody?: {
        Break?: { ErrorTypes?: string[]; BreakLength?: number };
        Intonation?: {
          ErrorTypes?: string[];
          MonotoneSyllablePitchDeltaConfidence?: number;
        };
      };
    };
  };
}

// ---------------------------------------------------------------------------
// SDK phoneme / prosody mapper functions
// ---------------------------------------------------------------------------

type SdkProsodyRaw = NonNullable<NonNullable<NonNullable<SdkWordDetail['PronunciationAssessment']>['Feedback']>['Prosody']>;

export function mapPhoneme(p: SdkPhonemeDetail): PhonemeResult {
  const nBestRaw = p.PronunciationAssessment?.NBestPhonemes;
  const result: PhonemeResult = {
    phoneme: p.Phoneme ?? '',
    accuracyScore: p.PronunciationAssessment?.AccuracyScore ?? 0,
  };
  if (nBestRaw !== undefined) {
    result.nBest = nBestRaw.map((nb) => ({
      phoneme: nb.Phoneme ?? '',
      score: nb.Score ?? 0,
    }));
  }
  return result;
}

export function buildProsodyFeedback(
  prosodyRaw: SdkProsodyRaw | undefined,
): ProsodyFeedback | undefined {
  if (prosodyRaw === undefined) return undefined;
  const base: ProsodyFeedback = {
    breakErrorTypes: (prosodyRaw.Break?.ErrorTypes ?? []).filter((t) => t !== 'None'),
    breakLengthMs: prosodyRaw.Break?.BreakLength ?? 0,
    intonationErrorTypes: (prosodyRaw.Intonation?.ErrorTypes ?? []).filter((t) => t !== 'None'),
  };
  const pitchDelta = prosodyRaw.Intonation?.MonotoneSyllablePitchDeltaConfidence;
  if (pitchDelta !== undefined) {
    return { ...base, monotoneSyllablePitchDeltaConfidence: pitchDelta };
  }
  return base;
}

export function sdkWordToWordResult(word: SdkWordDetail): WordResult {
  const phonemes = (word.Phonemes ?? []).map(mapPhoneme);
  const prosodyFeedback = buildProsodyFeedback(word.PronunciationAssessment?.Feedback?.Prosody);
  const result: WordResult = {
    word: word.Word,
    accuracyScore: word.PronunciationAssessment?.AccuracyScore ?? 0,
    errorType: toWordErrorType(word.PronunciationAssessment?.ErrorType),
    offsetMs: (word.Offset ?? 0) / 10_000,
    durationMs: (word.Duration ?? 0) / 10_000,
    phonemes,
  };
  if (word.Display !== undefined) result.display = word.Display;
  if (prosodyFeedback !== undefined) result.prosodyFeedback = prosodyFeedback;
  return result;
}

export function collectWordsFromEvent(
  event: SpeechRecognitionEventArgs,
  utterances: unknown[],
): WordResult[] {
  if (event.result.reason !== sdk.ResultReason.RecognizedSpeech) return [];
  const assessment = sdk.PronunciationAssessmentResult.fromResult(event.result);
  utterances.push(event.result);
  const rawWords: unknown = assessment.detailResult.Words;
  const sdkWords: SdkWordDetail[] = Array.isArray(rawWords) ? rawWords : [];
  return sdkWords.map(sdkWordToWordResult);
}
