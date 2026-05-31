// Type definitions for the Azure Speech SDK pronunciation assessment client

export interface PhonemeResult {
  phoneme: string;
  accuracyScore: number;
  nBest?: Array<{ phoneme: string; score: number }>;
}

export interface ProsodyFeedback {
  breakErrorTypes: string[];
  breakLengthMs: number;
  intonationErrorTypes: string[];
  monotoneSyllablePitchDeltaConfidence?: number;
}

export const WORD_ERROR_TYPES = [
  'None',
  'Mispronunciation',
  'Omission',
  'Insertion',
  'UnexpectedBreak',
  'MissingBreak',
  'Monotone',
] as const;

export type WordErrorType = (typeof WORD_ERROR_TYPES)[number];

export interface WordResult {
  word: string;
  display?: string;
  accuracyScore: number;
  errorType: WordErrorType;
  offsetMs: number;
  durationMs: number;
  phonemes: PhonemeResult[];
  prosodyFeedback?: ProsodyFeedback;
  l1Tags?: string[];
}

export interface PronunciationResult {
  pronScore: number;
  accuracyScore: number;
  fluencyScore: number;
  completenessScore: number;
  prosodyScore: number;
  words: WordResult[];
  /** Raw SDK utterance objects preserved for debugging */
  rawUtterances: unknown[];
}
