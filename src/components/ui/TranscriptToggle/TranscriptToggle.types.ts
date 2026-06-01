// Type definitions for the TranscriptToggle component

export interface TranscriptToggleProps {
  /** Original transcript text */
  originalText: string;
  /** Claude-rewritten text with vocab upgrades */
  improvedText: string;
  /** Words that were incorporated into the improved version */
  wordsUsed: string[];
  /** Word count for display badge */
  wordCount: number | null;
  /** Animation delay in ms for entrance */
  animationDelay?: number | undefined;
}
