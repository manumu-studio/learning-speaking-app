// Types for the VocabProgress component — tracks vocabulary adoption across sessions

export interface VocabItem {
  id: string;
  word: string;
  meaning: string;
  exampleSentence: string;
  firstUsedAt: string | null;
  createdAt: string;
}

export interface VocabProgressProps {
  items: VocabItem[];
  animationDelay?: number;
}
