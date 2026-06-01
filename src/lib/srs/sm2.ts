// SM-2 spaced repetition scheduler — pure function, no side effects

import type { ReviewRating, SrsState, SrsResult } from './sm2.types';

const MIN_EASE_FACTOR = 1.3;

/** Computes the next SRS interval, ease factor, and review date from the current state and rating. */
export function computeNextReview(
  state: SrsState,
  rating: ReviewRating,
  now: Date = new Date(),
): SrsResult {
  if (rating < 3) {
    return {
      nextInterval: 1,
      nextEaseFactor: Math.max(MIN_EASE_FACTOR, state.easeFactor - 0.2),
      nextReviewAt: addDays(now, 1),
    };
  }

  let nextInterval: number;
  if (state.reviewCount === 0) {
    nextInterval = 1;
  } else if (state.reviewCount === 1) {
    nextInterval = 6;
  } else {
    nextInterval = Math.round(state.interval * state.easeFactor);
  }

  const easeDelta = 0.1 - (5 - rating) * (0.08 + (5 - rating) * 0.02);
  const nextEaseFactor = Math.max(MIN_EASE_FACTOR, state.easeFactor + easeDelta);

  return {
    nextInterval,
    nextEaseFactor,
    nextReviewAt: addDays(now, nextInterval),
  };
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}
