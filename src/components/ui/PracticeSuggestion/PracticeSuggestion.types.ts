// Types for the PracticeSuggestion component

import type { PronunciationReport } from '@/components/ui/PronunciationSection';

export interface Exercise {
  /** Short label, e.g. "Tongue twister — 'th' sound" */
  title: string;
  /** The actual phrase or sentence to practise */
  phrase: string;
  /** Why this exercise is relevant */
  rationale: string;
}

export interface PracticeSuggestionProps {
  pronunciationReport: PronunciationReport;
  animationDelay: number;
}
