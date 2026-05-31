// Type definitions for ProsodyFeedback — per-word Azure prosody indicators
import type { WordPronunciation } from '@/components/ui/PronunciationSection';

export interface ProsodyFeedbackProps {
  words: WordPronunciation[];
  prosodyScore: number;
  animationDelay: number;
}

export interface WordProsodyIndicator {
  word: string;
  index: number;
  hasIntonationIssue: boolean;
  hasBreakIssue: boolean;
  isMonotone: boolean;
  intonationLabels: string[];
  breakLabels: string[];
}
