// Types for the pronunciation tip generator

export interface WeakWord {
  word: string;
  accuracyScore: number;
  errorType: string;
}

export interface PronunciationTipsInput {
  pronScore: number;
  accuracyScore: number;
  fluencyScore: number;
  completenessScore: number;
  prosodyScore: number;
  speakingRateWpm: number;
  weakWords: WeakWord[];
  topWeakPhonemes: string[];
  l1Tags: string[];
}

export interface PronunciationTip {
  focus: string;
  instruction: string;
}
