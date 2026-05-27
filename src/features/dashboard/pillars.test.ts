// Unit tests for pillar score computation functions

import { describe, it, expect } from 'vitest';
import { computePillarScores } from './pillars';
import type { DashboardMetric } from './dashboard.types';

function makeMetric(
  key: DashboardMetric['key'],
  currentScore: number,
  history: number[] = [],
): DashboardMetric {
  return {
    key,
    label: key,
    currentLevel: 'medium',
    currentScore,
    trend: 'stable',
    history,
  };
}

describe('computePillarScores', () => {
  it('returns 3 PillarScore entries when given empty metrics', () => {
    const result = computePillarScores([]);
    expect(result).toHaveLength(3);
    result.forEach((ps) => {
      expect(ps.averageScore).toBe(0);
      expect(ps.delta).toBe(0);
      expect(ps.sparklineData).toEqual([]);
    });
  });

  it('computes correct average for delivery pillar', () => {
    const metrics = [
      makeMetric('speakingRate', 8),
      makeMetric('fillerUsage', 6),
      makeMetric('argumentClosure', 7),
    ];
    const result = computePillarScores(metrics);
    const delivery = result.find((ps) => ps.pillarKey === 'delivery');
    expect(delivery?.averageScore).toBeCloseTo(7.0, 5);
  });

  it('excludes missing metrics from the average', () => {
    const metrics = [
      makeMetric('connectorRepetition', 8),
      makeMetric('structuralVariety', 6),
    ];
    const result = computePillarScores(metrics);
    const language = result.find((ps) => ps.pillarKey === 'language');
    expect(language?.averageScore).toBeCloseTo(7.0, 5);
  });

  it('returns positive delta when score is above history mean', () => {
    const metrics = [
      makeMetric('speakingRate', 9, [5, 5, 5, 5, 5, 5, 5]),
      makeMetric('fillerUsage', 9, [5, 5, 5, 5, 5, 5, 5]),
      makeMetric('argumentClosure', 9, [5, 5, 5, 5, 5, 5, 5]),
    ];
    const result = computePillarScores(metrics);
    const delivery = result.find((ps) => ps.pillarKey === 'delivery');
    expect(delivery?.delta).toBeGreaterThan(0);
  });

  it('returns negative delta when score is below history mean', () => {
    const metrics = [makeMetric('speakingRate', 3, [9, 9, 9, 9, 9, 9, 9])];
    const result = computePillarScores(metrics);
    const delivery = result.find((ps) => ps.pillarKey === 'delivery');
    expect(delivery?.delta).toBeLessThan(0);
  });

  it('uses shortest history array length for sparklineData', () => {
    const metrics = [
      makeMetric('speakingRate', 7, [5, 6, 7]),
      makeMetric('fillerUsage', 7, [5, 6]),
      makeMetric('argumentClosure', 7, [5, 6, 7, 8]),
    ];
    const result = computePillarScores(metrics);
    const delivery = result.find((ps) => ps.pillarKey === 'delivery');
    expect(delivery?.sparklineData).toHaveLength(2);
  });

  it('returns empty sparklineData when all histories are empty', () => {
    const metrics = [makeMetric('speakingRate', 7, [])];
    const result = computePillarScores(metrics);
    const delivery = result.find((ps) => ps.pillarKey === 'delivery');
    expect(delivery?.sparklineData).toEqual([]);
  });

  it('returns pillars in order: delivery, language, pronunciation', () => {
    const result = computePillarScores([]);
    expect(result.map((ps) => ps.pillarKey)).toEqual([
      'delivery',
      'language',
      'pronunciation',
    ]);
  });
});
