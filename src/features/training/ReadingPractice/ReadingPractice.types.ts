// Types for the ReadingPractice feature — AI generates text, user reads aloud, pronunciation assessed

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
