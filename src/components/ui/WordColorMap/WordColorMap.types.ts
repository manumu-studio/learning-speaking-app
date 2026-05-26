// Types for the WordColorMap component

import type { WordPronunciation } from '@/components/ui/PronunciationSection';

export type WordColor = 'green' | 'yellow' | 'red' | 'gray-italic';

export interface WordColorMapProps {
  words: WordPronunciation[];
  animationDelay: number;
}

export interface ColoredWord {
  word: WordPronunciation;
  color: WordColor;
  index: number;
}
