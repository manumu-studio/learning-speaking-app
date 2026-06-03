// Tests for computePillarDeltas — day-over-day pillar score delta computation

import { describe, it, expect } from 'vitest';
import { computePillarDeltas } from './computePillarDeltas';

describe('computePillarDeltas', () => {
  const baseScores = { delivery: 7.0, language: 6.0, pronunciation: 8.0 };

  it('returns correct overall score as mean of 3 pillars', () => {
    const result = computePillarDeltas(baseScores, null);
    // (7 + 6 + 8) / 3 = 7.0
    expect(result.overallScore).toBe(7.0);
  });

  it('rounds overall score to 1 decimal place', () => {
    const scores = { delivery: 7.1, language: 6.2, pronunciation: 8.4 };
    const result = computePillarDeltas(scores, null);
    // (7.1 + 6.2 + 8.4) / 3 = 7.233... → 7.2
    expect(result.overallScore).toBe(7.2);
  });

  it('returns null deltas when no yesterday data', () => {
    const result = computePillarDeltas(baseScores, null);
    expect(result.metricDeltas.delivery).toBeNull();
    expect(result.metricDeltas.language).toBeNull();
    expect(result.metricDeltas.pronunciation).toBeNull();
  });

  it('returns positive deltas when today > yesterday', () => {
    const yesterday = { delivery: 5.0, language: 4.0, pronunciation: 6.0 };
    const result = computePillarDeltas(baseScores, yesterday);
    expect(result.metricDeltas.delivery).toBe(2.0);
    expect(result.metricDeltas.language).toBe(2.0);
    expect(result.metricDeltas.pronunciation).toBe(2.0);
  });

  it('returns negative deltas when today < yesterday', () => {
    const yesterday = { delivery: 9.0, language: 8.0, pronunciation: 9.5 };
    const result = computePillarDeltas(baseScores, yesterday);
    expect(result.metricDeltas.delivery).toBe(-2.0);
    expect(result.metricDeltas.language).toBe(-2.0);
    expect(result.metricDeltas.pronunciation).toBe(-1.5);
  });

  it('returns 0 deltas when scores are unchanged', () => {
    const result = computePillarDeltas(baseScores, baseScores);
    expect(result.metricDeltas.delivery).toBe(0);
    expect(result.metricDeltas.language).toBe(0);
    expect(result.metricDeltas.pronunciation).toBe(0);
  });

  it('rounds deltas to 1 decimal place', () => {
    const today = { delivery: 7.15, language: 6.0, pronunciation: 8.0 };
    const yesterday = { delivery: 7.0, language: 6.0, pronunciation: 8.0 };
    const result = computePillarDeltas(today, yesterday);
    // 7.15 - 7.0 = 0.15 → rounds to 0.2 (Math.round(0.15 * 10) / 10 = 0.2)
    expect(result.metricDeltas.delivery).toBe(0.2);
  });

  it('passes today scores through to pillarScores unchanged', () => {
    const result = computePillarDeltas(baseScores, null);
    expect(result.pillarScores).toEqual(baseScores);
  });
});
