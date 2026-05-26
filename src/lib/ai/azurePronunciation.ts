// Azure Speech SDK client for pronunciation assessment — wraps continuous recognition
// and post-processes results with client-side miscue detection via difflib
import * as sdk from 'microsoft-cognitiveservices-speech-sdk';
import { SequenceMatcher } from 'difflib';
import type { PronunciationResult, WordResult, PhonemeResult, ProsodyFeedback, WordErrorType } from './azurePronunciation.types';
import { WORD_ERROR_TYPES } from './azurePronunciation.types';

// ---------------------------------------------------------------------------
// Extended SDK word type — the SDK's DetailResult.Words interface omits many
// runtime-populated fields (Offset, Duration, Feedback) that appear in JSON.
// ---------------------------------------------------------------------------

function toWordErrorType(raw: string | undefined): WordErrorType {
  const candidate = raw ?? 'None';
  if ((WORD_ERROR_TYPES as readonly string[]).includes(candidate)) {
    return candidate as WordErrorType;
  }
  return 'None';
}

interface SdkWordDetail {
  Word: string;
  Offset?: number;
  Duration?: number;
  Phonemes?: Array<{
    Phoneme?: string;
    PronunciationAssessment?: {
      AccuracyScore?: number;
      NBestPhonemes?: Array<{ Phoneme?: string; Score?: number }>;
    };
  }>;
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

export async function assessPronunciation(
  wavBuffer: Buffer,
  referenceText: string,
  azureKey: string,
  azureRegion: string,
): Promise<PronunciationResult> {
  const speechConfig = sdk.SpeechConfig.fromSubscription(azureKey, azureRegion);
  speechConfig.speechRecognitionLanguage = 'en-US';

  // PushAudioInputStream.write requires ArrayBuffer — copy into a fresh ArrayBuffer
  // (wavBuffer.buffer may be a SharedArrayBuffer, which write() does not accept)
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
    false, // enableMiscue -- handled client-side via difflib
  );

  // enableProsodyAssessment is a setter in the SDK type, not a method
  pronunciationConfig.enableProsodyAssessment = true;

  // Set NBest phoneme count directly via the setter (available since SDK 1.20.0)
  pronunciationConfig.nbestPhonemeCount = 5;

  const recognizer = new sdk.SpeechRecognizer(speechConfig, audioConfig);
  pronunciationConfig.applyTo(recognizer);

  return new Promise<PronunciationResult>((resolve, reject) => {
    const utterances: unknown[] = [];
    const allWords: WordResult[] = [];

    recognizer.recognized = (_sender, event) => {
      if (event.result.reason !== sdk.ResultReason.RecognizedSpeech) return;

      const assessment = sdk.PronunciationAssessmentResult.fromResult(event.result);
      utterances.push(event.result);

      // Cast to extended interface to access runtime-populated fields not in SDK types
      const sdkWords = assessment.detailResult.Words as unknown as SdkWordDetail[];

      for (const word of sdkWords) {
        const phonemes: PhonemeResult[] = (word.Phonemes ?? []).map((p) => {
          const nBestRaw = p.PronunciationAssessment?.NBestPhonemes;
          const phonemeResult: PhonemeResult = {
            phoneme: p.Phoneme ?? '',
            accuracyScore: p.PronunciationAssessment?.AccuracyScore ?? 0,
          };
          if (nBestRaw !== undefined) {
            phonemeResult.nBest = nBestRaw.map((nb) => ({
              phoneme: nb.Phoneme ?? '',
              score: nb.Score ?? 0,
            }));
          }
          return phonemeResult;
        });

        const prosodyRaw = word.PronunciationAssessment?.Feedback?.Prosody;
        const prosodyFeedback: ProsodyFeedback | undefined = prosodyRaw
          ? {
              breakErrorTypes: prosodyRaw.Break?.ErrorTypes ?? [],
              breakLengthMs: prosodyRaw.Break?.BreakLength ?? 0,
              intonationErrorTypes: prosodyRaw.Intonation?.ErrorTypes ?? [],
              ...(prosodyRaw.Intonation?.MonotoneSyllablePitchDeltaConfidence !== undefined
                ? { monotoneSyllablePitchDeltaConfidence: prosodyRaw.Intonation.MonotoneSyllablePitchDeltaConfidence }
                : {}),
            }
          : undefined;

        const wordResult: WordResult = {
          word: word.Word,
          accuracyScore: word.PronunciationAssessment?.AccuracyScore ?? 0,
          errorType: toWordErrorType(word.PronunciationAssessment?.ErrorType),
          offsetMs: (word.Offset ?? 0) / 10_000, // 100ns ticks to ms
          durationMs: (word.Duration ?? 0) / 10_000,
          phonemes,
          ...(prosodyFeedback !== undefined ? { prosodyFeedback } : {}),
        };

        allWords.push(wordResult);
      }
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

function aggregateResults(
  words: WordResult[],
  rawUtterances: unknown[],
  referenceText: string,
): PronunciationResult {
  // Client-side miscue detection via difflib
  const refWords = referenceText.toLowerCase().split(/\s+/).filter(Boolean);
  const recWords = words.map((w) => w.word.toLowerCase());

  // SequenceMatcher produces opcodes: equal / replace / delete / insert
  // 'delete' in ref = Omission, 'insert' in recognized = Insertion
  const matcher = new SequenceMatcher(null, refWords, recWords);
  const opcodes = matcher.getOpcodes();

  const taggedWords: WordResult[] = words.map((w) => ({ ...w }));

  for (const [tag, , , j1, j2] of opcodes) {
    if (tag === 'insert') {
      for (let j = j1; j < j2; j++) {
        const existing = taggedWords[j];
        if (existing) {
          const updated: WordResult = { ...existing, errorType: 'Insertion' };
          taggedWords[j] = updated;
        }
      }
    }
    if (tag === 'replace') {
      for (let j = j1; j < j2; j++) {
        const existing = taggedWords[j];
        if (existing && existing.errorType === 'None') {
          const updated: WordResult = { ...existing, errorType: 'Mispronunciation' };
          taggedWords[j] = updated;
        }
      }
    }
  }

  // Omissions: reference words with no match get synthetic entries
  const omissions: WordResult[] = [];
  for (const [tag, i1, i2] of opcodes) {
    if (tag === 'delete') {
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
  }

  const finalWords = [...taggedWords, ...omissions];

  // Aggregate scores
  const validWords = taggedWords.filter((w) => w.errorType !== 'Insertion');
  const accuracy =
    validWords.length > 0
      ? validWords.reduce((sum, w) => sum + w.accuracyScore, 0) / validWords.length
      : 0;

  const completeness =
    refWords.length > 0
      ? Math.min(100, (validWords.length / refWords.length) * 100)
      : 0;

  // Fluency: ratio of speech duration to total duration (simplified without silence gap data)
  const totalDurationMs = taggedWords.reduce((sum, w) => sum + w.durationMs, 0);
  const speechDurationMs = validWords.reduce((sum, w) => sum + w.durationMs, 0);
  const fluency =
    totalDurationMs > 0 ? Math.min(100, (speechDurationMs / totalDurationMs) * 100) : 0;

  const prosodyWords = taggedWords.filter((w) => w.prosodyFeedback !== undefined);
  const prosody =
    prosodyWords.length > 0
      ? prosodyWords.reduce((sum, w) => {
          const delta = w.prosodyFeedback?.monotoneSyllablePitchDeltaConfidence ?? 0.5;
          return sum + delta * 100;
        }, 0) / prosodyWords.length
      : 50; // neutral default when no prosody data

  const worst = Math.min(accuracy, fluency, completeness, prosody);
  const pronScore = worst * 0.4 + accuracy * 0.15 + fluency * 0.15 + completeness * 0.15 + prosody * 0.15;

  return {
    pronScore: Math.round(pronScore * 10) / 10,
    accuracyScore: Math.round(accuracy * 10) / 10,
    fluencyScore: Math.round(fluency * 10) / 10,
    completenessScore: Math.round(completeness * 10) / 10,
    prosodyScore: Math.round(prosody * 10) / 10,
    words: finalWords,
    rawUtterances,
  };
}
