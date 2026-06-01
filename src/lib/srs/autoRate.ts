// Auto-rate vocabulary items based on usage detection signals

import type { ReviewRating } from './sm2.types';

export type AutoRateInput = {
  wasUsedInSession: boolean;
  sessionsSinceSuggested: number;
};

/**
 * Derives an SM-2 review rating from vocabulary usage detection signals.
 *
 * - Word used in session AND ≤ 2 sessions since suggested → rating 5 (easy, early use)
 * - Word used in session AND > 2 sessions since suggested → rating 4 (good, delayed use)
 * - Word NOT used AND ≥ 3 sessions have passed since suggestion → rating 1 (forgotten)
 * - Otherwise → `null` (no automatic rating; caller should wait or prompt manual review)
 *
 * @param input - Usage detection signals: `wasUsedInSession` and `sessionsSinceSuggested`.
 * @returns A `ReviewRating` (1–5) or `null` if no automatic rating applies.
 */
export function autoRate(input: AutoRateInput): ReviewRating | null {
  if (input.wasUsedInSession) {
    return input.sessionsSinceSuggested <= 2 ? 5 : 4;
  }

  if (input.sessionsSinceSuggested >= 3) {
    return 1;
  }

  return null;
}
