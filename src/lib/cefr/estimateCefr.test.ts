// Tests for CEFR estimation utility — rubric thresholds and edge cases
import { describe, expect, it } from 'vitest';
import type { MetricScoreInput } from './cefr.types';
import { estimateCefr } from './estimateCefr';

function allMetricsAt(score: number): MetricScoreInput[] {
  return [
    { key: 'connectorRepetition', score },
    { key: 'structuralVariety', score },
    { key: 'vocabularyPrecision', score },
    { key: 'verbAccuracy', score },
    { key: 'argumentClosure', score },
    { key: 'fillerUsage', score },
    { key: 'lexicalSophistication', score },
    { key: 'registerPragmatics', score },
    { key: 'pronunciationAccuracy', score },
    { key: 'prosodyScore', score },
    { key: 'speakingRate', score },
  ];
}

describe('estimateCefr', () => {
  it('returns null for empty metrics', () => {
    expect(estimateCefr([])).toBeNull();
  });

  it('returns C2 when all metrics >= 8.0 and weighted average >= 8.5', () => {
    const result = estimateCefr(allMetricsAt(9.0));
    expect(result?.level).toBe('c2');
    expect(result?.weightedAverage).toBe(9.0);
  });

  it('returns C1 high when all metrics = 8.0 but weighted avg = 8.0 (< 8.5)', () => {
    const result = estimateCefr(allMetricsAt(8.0));
    expect(result?.level).toBe('c1-high');
    expect(result?.weightedAverage).toBe(8.0);
  });

  it('returns C1 high when weighted average >= 7.0', () => {
    const result = estimateCefr(allMetricsAt(7.0));
    expect(result?.level).toBe('c1-high');
  });

  it('returns C1 mid when weighted average >= 5.5', () => {
    const result = estimateCefr(allMetricsAt(5.5));
    expect(result?.level).toBe('c1-mid');
  });

  it('returns C1 low when weighted average >= 4.0', () => {
    const result = estimateCefr(allMetricsAt(4.0));
    expect(result?.level).toBe('c1-low');
  });

  it('returns below-c1 when weighted average < 4.0', () => {
    const result = estimateCefr(allMetricsAt(3.0));
    expect(result?.level).toBe('below-c1');
  });

  it('requires BOTH conditions for C2 (all >= 8.0 AND weighted avg >= 8.5)', () => {
    // Most metrics at 9 but one at 7 → fails the "all >= 8.0" condition
    const metrics = allMetricsAt(9.0);
    metrics[0] = { key: 'connectorRepetition', score: 7.0 };
    const result = estimateCefr(metrics);
    expect(result?.level).toBe('c1-high');
  });

  it('handles fewer than 11 metrics gracefully', () => {
    // Only language metrics — should still compute
    const metrics: MetricScoreInput[] = [
      { key: 'connectorRepetition', score: 7.0 },
      { key: 'structuralVariety', score: 8.0 },
      { key: 'vocabularyPrecision', score: 7.5 },
      { key: 'verbAccuracy', score: 7.0 },
    ];
    const result = estimateCefr(metrics);
    expect(result).not.toBeNull();
    expect(result?.level).toBe('c1-high');
    // Only language pillar has data, so pronunciation/delivery are 0
    expect(result?.pillarBreakdown.language).toBeCloseTo(7.375, 2);
  });

  it('redistributes weight when only some pillars have data', () => {
    // Only delivery metrics
    const metrics: MetricScoreInput[] = [
      { key: 'speakingRate', score: 6.0 },
      { key: 'fillerUsage', score: 6.0 },
      { key: 'argumentClosure', score: 6.0 },
    ];
    const result = estimateCefr(metrics);
    expect(result).not.toBeNull();
    // With only delivery pillar data, weighted average = delivery score
    expect(result?.weightedAverage).toBe(6.0);
    expect(result?.level).toBe('c1-mid');
  });

  it('returns pillar breakdown with correct averages', () => {
    const metrics: MetricScoreInput[] = [
      { key: 'pronunciationAccuracy', score: 8.0 },
      { key: 'prosodyScore', score: 6.0 },
      { key: 'connectorRepetition', score: 7.0 },
      { key: 'structuralVariety', score: 8.0 },
      { key: 'vocabularyPrecision', score: 7.0 },
      { key: 'verbAccuracy', score: 6.0 },
      { key: 'lexicalSophistication', score: 7.0 },
      { key: 'registerPragmatics', score: 7.0 },
      { key: 'speakingRate', score: 7.0 },
      { key: 'fillerUsage', score: 6.0 },
      { key: 'argumentClosure', score: 8.0 },
    ];
    const result = estimateCefr(metrics);
    expect(result).not.toBeNull();
    expect(result?.pillarBreakdown.pronunciation).toBe(7.0);
    expect(result?.pillarBreakdown.language).toBe(7.0);
    expect(result?.pillarBreakdown.delivery).toBe(7.0);
    expect(result?.weightedAverage).toBe(7.0);
    expect(result?.level).toBe('c1-high');
  });

  it('rounds weighted average to 2 decimal places', () => {
    const metrics: MetricScoreInput[] = [
      { key: 'pronunciationAccuracy', score: 7.3 },
      { key: 'prosodyScore', score: 6.7 },
      { key: 'connectorRepetition', score: 5.1 },
      { key: 'structuralVariety', score: 6.9 },
      { key: 'vocabularyPrecision', score: 7.2 },
      { key: 'verbAccuracy', score: 6.8 },
      { key: 'lexicalSophistication', score: 5.5 },
      { key: 'registerPragmatics', score: 6.3 },
      { key: 'speakingRate', score: 7.1 },
      { key: 'fillerUsage', score: 5.9 },
      { key: 'argumentClosure', score: 6.4 },
    ];
    const result = estimateCefr(metrics);
    expect(result).not.toBeNull();
    const decimalPlaces = result?.weightedAverage.toString().split('.')[1]?.length ?? 0;
    expect(decimalPlaces).toBeLessThanOrEqual(2);
  });

  it('C2 boundary: weighted avg exactly 8.5 with all >= 8.0', () => {
    const result = estimateCefr(allMetricsAt(8.5));
    expect(result?.level).toBe('c2');
  });

  it('C1 high boundary: weighted avg exactly 7.0', () => {
    const result = estimateCefr(allMetricsAt(7.0));
    expect(result?.level).toBe('c1-high');
  });

  it('C1 mid boundary: weighted avg exactly 5.5', () => {
    const result = estimateCefr(allMetricsAt(5.5));
    expect(result?.level).toBe('c1-mid');
  });

  it('C1 low boundary: weighted avg exactly 4.0', () => {
    const result = estimateCefr(allMetricsAt(4.0));
    expect(result?.level).toBe('c1-low');
  });
});
