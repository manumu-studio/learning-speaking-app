// Types for the ReadingPractice feature — library view + AI text generation + pronunciation assessment

import type { AggregatedPhoneme } from '@/lib/pronunciation/aggregatePhonemes';

// --- Library types ---

export interface MispronouncedWord {
  word: string;
  accuracyScore: number;
  errorType: string;
}

export interface SessionVocab {
  word: string;
  meaning: string;
  adopted: boolean;
}

export interface ReadingPracticeSession {
  id: string;
  workoutNumber: number;
  intentLabel: string;
  createdAt: string;
  pronScore: number | null;
  weakPhonemes: AggregatedPhoneme[];
  mispronounced: MispronouncedWord[];
  vocab: SessionVocab[];
}

export interface GlobalWeaknesses {
  phonemes: AggregatedPhoneme[];
  unadoptedVocab: Array<{ word: string; meaning: string }>;
}

export interface ReadingPracticeLibraryData {
  globalWeaknesses: GlobalWeaknesses;
  sessions: ReadingPracticeSession[];
}

// --- Practice flow types ---

export type ReadingPracticeView = 'library' | 'practice';

export type ReadingPracticeState =
  | 'loading'
  | 'ready'
  | 'recording'
  | 'processing'
  | 'results';

export interface GeneratedText {
  text: string;
  targetPhonemes: string[];
  targetWords: string[];
}

export interface WordScore {
  word: string;
  accuracyScore: number;
  isTarget: boolean;
}

export interface ReadingPracticeResult {
  wordScores: WordScore[];
  overallScore: number;
  targetPhonemeScores: Array<{ phoneme: string; averageScore: number }>;
}

export type DifficultyLevel = 'beginner' | 'intermediate' | 'advanced';
