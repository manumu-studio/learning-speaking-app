// Tests for dashboard helper functions — streak, trend, workout weeks
import { describe, expect, it } from 'vitest';
import { computeStreak, computeTrend, computeWorkoutWeeks, getISOWeekKey } from './getDashboardHelpers';

describe('computeTrend', () => {
  it('returns stable for fewer than 4 data points', () => {
    expect(computeTrend([5, 6, 7])).toBe('stable');
  });

  it('returns stable for flat history', () => {
    expect(computeTrend([5, 5, 5, 5, 5])).toBe('stable');
  });

  it('returns improving when recent avg is >10% higher', () => {
    expect(computeTrend([4, 4, 4, 6, 6, 6])).toBe('improving');
  });

  it('returns declining when recent avg is >10% lower', () => {
    expect(computeTrend([8, 8, 8, 6, 6, 6])).toBe('declining');
  });

  it('returns stable when prev avg is 0', () => {
    expect(computeTrend([0, 0, 0, 5, 5, 5])).toBe('stable');
  });
});

describe('computeWorkoutWeeks', () => {
  it('returns 0 for empty dates', () => {
    expect(computeWorkoutWeeks([])).toBe(0);
  });

  it('returns 0 when fewer than 3 sessions in any week', () => {
    const dates = [new Date('2026-01-05'), new Date('2026-01-06')];
    expect(computeWorkoutWeeks(dates)).toBe(0);
  });

  it('returns 1 when exactly 3 sessions in one week', () => {
    const dates = [
      new Date('2026-01-05'),
      new Date('2026-01-06'),
      new Date('2026-01-07'),
    ];
    expect(computeWorkoutWeeks(dates)).toBe(1);
  });
});

describe('getISOWeekKey', () => {
  it('returns correct ISO week key', () => {
    const result = getISOWeekKey(new Date('2026-01-05'));
    expect(result).toMatch(/^2026-W\d{2}$/);
  });

  it('returns consistent key for same week', () => {
    const mon = getISOWeekKey(new Date('2026-01-05'));
    const tue = getISOWeekKey(new Date('2026-01-06'));
    expect(mon).toBe(tue);
  });
});

describe('computeStreak', () => {
  it('returns 0 for empty dates', () => {
    expect(computeStreak([])).toBe(0);
  });

  it('returns 1 when only today has a session', () => {
    expect(computeStreak([new Date()])).toBe(1);
  });

  it('counts consecutive days backward from today', () => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const twoDaysAgo = new Date(today);
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
    expect(computeStreak([today, yesterday, twoDaysAgo])).toBe(3);
  });

  it('breaks streak on gap day', () => {
    const today = new Date();
    const threeDaysAgo = new Date(today);
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    expect(computeStreak([today, threeDaysAgo])).toBe(1);
  });
});
