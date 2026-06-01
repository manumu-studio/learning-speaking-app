// Spaced repetition system types — SM-2 algorithm variant

export type ReviewRating = 0 | 1 | 2 | 3 | 4 | 5;

export type ReviewRatingLabel = 'again' | 'hard' | 'good' | 'easy';

export const RATING_LABEL_MAP = {
  again: 1,
  hard: 2,
  good: 4,
  easy: 5,
} as const satisfies Record<ReviewRatingLabel, ReviewRating>;

export type SrsState = {
  interval: number;
  easeFactor: number;
  reviewCount: number;
};

export type SrsResult = {
  nextInterval: number;
  nextEaseFactor: number;
  nextReviewAt: Date;
};
