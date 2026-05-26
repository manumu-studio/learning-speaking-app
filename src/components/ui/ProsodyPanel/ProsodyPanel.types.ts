// Types for the ProsodyPanel component

import type { WordPronunciation } from '@/components/ui/PronunciationSection';

export interface ProsodyPanelProps {
  words: WordPronunciation[];
  speakingRateWpm: number;
  prosodyScore: number;
  animationDelay: number;
}

export interface ErrorFrequency {
  type: string;
  count: number;
}

export type RateStatus = 'too-slow' | 'ideal' | 'too-fast';
