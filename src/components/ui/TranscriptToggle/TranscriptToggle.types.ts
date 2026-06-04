// Type definitions for the TranscriptToggle component

import type { WordPronunciation } from '@/components/ui/PronunciationSection';

export interface TranscriptToggleProps {
  /** Original transcript text */
  originalText: string;
  /** Claude-rewritten text with vocab upgrades */
  improvedText: string | null;
  /** Words that were incorporated into the improved version */
  wordsUsed: string[];
  /** Word count for display badge */
  wordCount: number | null;
  /** Optional word-level pronunciation data for the pronunciation-map tab */
  pronunciationWords?: WordPronunciation[] | undefined;
  /** Animation delay in ms for entrance */
  animationDelay?: number | undefined;
}
