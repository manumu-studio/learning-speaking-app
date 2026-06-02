// Types for the WordColorMap component

import type { WordPronunciation } from '@/components/ui/PronunciationSection';

// 3-band intelligibility scale: red <60, amber 60–84, green 85+ (raised floor for C2 target).
// `gray-italic` marks inserted words (not part of the band scale).
export type WordColor = 'red' | 'amber' | 'green' | 'gray-italic';

export interface WordColorMapProps {
  words: WordPronunciation[];
  animationDelay: number;
}

export interface ColoredWord {
  word: WordPronunciation;
  color: WordColor;
  index: number;
}
