// Unit tests for SM-2 spaced repetition scheduler
import { describe, expect, it } from 'vitest';

import { computeNextReview } from '../sm2';
import type { SrsState } from '../sm2.types';

const NOW = new Date('2026-06-01T12:00:00Z');

function makeState(overrides: Partial<SrsState> = {}): SrsState {
  return {
    interval: 1,
    easeFactor: 2.5,
    reviewCount: 0,
    ...overrides,
  };
}

describe('computeNextReview', () => {
  it('first review with passing rating → interval = 1 day', () => {
    const result = computeNextReview(makeState(), 4, NOW);
    expect(result.nextInterval).toBe(1);
    expect(result.nextReviewAt).toEqual(new Date('2026-06-02T12:00:00Z'));
  });

  it('second review with passing rating → interval = 6 days', () => {
    const result = computeNextReview(makeState({ reviewCount: 1 }), 4, NOW);
    expect(result.nextInterval).toBe(6);
    expect(result.nextReviewAt).toEqual(new Date('2026-06-07T12:00:00Z'));
  });

  it('third review with rating 4 → interval = round(6 * 2.5) = 15 days', () => {
    const result = computeNextReview(
      makeState({ reviewCount: 2, interval: 6 }),
      4,
      NOW,
    );
    expect(result.nextInterval).toBe(15);
  });

  it('lapse (rating < 3) → interval resets to 1, ease decreases', () => {
    const result = computeNextReview(
      makeState({ reviewCount: 5, interval: 30, easeFactor: 2.5 }),
      2,
      NOW,
    );
    expect(result.nextInterval).toBe(1);
    expect(result.nextEaseFactor).toBe(2.3);
    expect(result.nextReviewAt).toEqual(new Date('2026-06-02T12:00:00Z'));
  });

  it('ease factor never drops below 1.3', () => {
    const result = computeNextReview(
      makeState({ easeFactor: 1.3 }),
      1,
      NOW,
    );
    expect(result.nextEaseFactor).toBe(1.3);
  });

  it('easy rating (5) increases ease factor', () => {
    const result = computeNextReview(makeState({ easeFactor: 2.5 }), 5, NOW);
    expect(result.nextEaseFactor).toBe(2.6);
  });

  it('good rating (4) slightly decreases ease factor', () => {
    const result = computeNextReview(makeState({ easeFactor: 2.5 }), 4, NOW);
    expect(result.nextEaseFactor).toBeCloseTo(2.5, 1);
  });

  it('rating 3 decreases ease factor more than 4', () => {
    const result = computeNextReview(makeState({ easeFactor: 2.5 }), 3, NOW);
    expect(result.nextEaseFactor).toBeLessThan(2.5);
  });

  it('rating 0 triggers lapse just like rating 2', () => {
    const result = computeNextReview(
      makeState({ reviewCount: 3, interval: 15 }),
      0,
      NOW,
    );
    expect(result.nextInterval).toBe(1);
  });

  it('defaults now to current date when not provided', () => {
    const result = computeNextReview(makeState(), 4);
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    expect(result.nextReviewAt.getDate()).toBe(tomorrow.getDate());
  });
});
