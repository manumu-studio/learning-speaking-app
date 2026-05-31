// Type definitions for ProsodyFeedback — coach-style prosody coaching with actionable tips
import type { WordPronunciation } from '@/components/ui/PronunciationSection';

export type ProsodyIssueType = 'break' | 'intonation' | 'monotone';

export interface ProsodyIssue {
  word: string;
  index: number;
  type: ProsodyIssueType;
  tip: string;
  severity: number;
}

export interface ProsodyCoachingSummary {
  topIssues: ProsodyIssue[];
  totalIssueCount: number;
  coachingSummary: string | null;
  hasIssues: boolean;
}

export interface ProsodyFeedbackProps {
  words: WordPronunciation[];
  prosodyScore: number;
  animationDelay: number;
}
