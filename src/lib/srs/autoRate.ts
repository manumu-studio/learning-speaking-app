// Auto-rate vocabulary items based on usage detection signals

import type { ReviewRating } from './sm2.types';

export type AutoRateInput = {
  wasUsedInSession: boolean;
  sessionsSinceSuggested: number;
};

/** Derives a review rating from usage signals; returns null if no automatic rating applies. */
export function autoRate(input: AutoRateInput): ReviewRating | null {
  if (input.wasUsedInSession) {
    return input.sessionsSinceSuggested <= 2 ? 5 : 4;
  }

  if (input.sessionsSinceSuggested >= 3) {
    return 1;
  }

  return null;
}
