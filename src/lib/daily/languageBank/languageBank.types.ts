// Types for the Language Bank mastery and suggestion system

export type MasteryState = 'emerging' | 'developing' | 'consolidating' | 'mastered';
export type SuggestionCategory = 'collocation' | 'verb' | 'prepositional_verb' | 'phrasal_verb' | 'connector' | 'adjective' | 'adverb';
export type ItemSource = 'naturalness_flag' | 'vocab_suggestion' | 'ai_detected' | 'manual';

export interface LanguageBankItemData {
  id: string;
  text: string;
  lemmaOrPattern: string | null;
  category: SuggestionCategory;
  source: ItemSource;
  usageCount: number;
  masteryState: MasteryState;
  isActiveTarget: boolean;
  firstSuggestedAt: Date;
  lastUsedAt: Date | null;
  lastSuggestedAt: Date | null;
  nextRetargetAt: Date | null;
}

// Mastery thresholds
export const MASTERY_THRESHOLDS = {
  emerging: { min: 0, max: 4 },
  developing: { min: 5, max: 10 },
  consolidating: { min: 11, max: 14 },
  mastered: { min: 15, max: Infinity },
} as const;

export const MASTERY_ORDER: readonly MasteryState[] = ['emerging', 'developing', 'consolidating', 'mastered'] as const;

// Weekday rotation for the 4 rotating suggestion slots
export const WEEKDAY_CATEGORIES: Record<number, SuggestionCategory> = {
  1: 'connector',        // Mon
  2: 'adjective',        // Tue
  3: 'adverb',           // Wed
  4: 'phrasal_verb',     // Thu
  5: 'connector',        // Fri
  6: 'adjective',        // Sat
  0: 'adverb',           // Sun
} as const;
