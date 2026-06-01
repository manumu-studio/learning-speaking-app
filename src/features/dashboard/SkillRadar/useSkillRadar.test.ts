// Tests for SkillRadar coordinate computation
import { describe, expect, it, vi } from 'vitest';
import type { RadarScore } from './SkillRadar.types';

vi.mock('react', () => ({
  useMemo: (fn: () => unknown) => fn(),
}));

import { useSkillRadar } from './useSkillRadar';

function makeScores(count: number, score = 7): RadarScore[] {
  return Array.from({ length: count }, (_, i) => ({
    key: `metric${i}`,
    label: `Metric ${i}`,
    score,
    c2Threshold: 8,
  }));
}

describe('useSkillRadar', () => {
  it('returns empty data for no scores', () => {
    const result = useSkillRadar([]);
    expect(result.points).toHaveLength(0);
    expect(result.scorePath).toBe('');
    expect(result.thresholdPath).toBe('');
    expect(result.gridPaths).toHaveLength(0);
  });

  it('produces correct number of points', () => {
    const result = useSkillRadar(makeScores(10));
    expect(result.points).toHaveLength(10);
  });

  it('produces SVG path strings with M and L commands', () => {
    const result = useSkillRadar(makeScores(5));
    expect(result.scorePath).toMatch(/^M .* Z$/);
    expect(result.thresholdPath).toMatch(/^M .* Z$/);
  });

  it('produces 3 grid ring paths', () => {
    const result = useSkillRadar(makeScores(6));
    expect(result.gridPaths).toHaveLength(3);
    for (const path of result.gridPaths) {
      expect(path).toMatch(/^M .* Z$/);
    }
  });

  it('assigns labels from input scores', () => {
    const result = useSkillRadar(makeScores(3));
    expect(result.points[0]?.label).toBe('Metric 0');
    expect(result.points[2]?.label).toBe('Metric 2');
  });

  it('positions first point at top (angle -90 degrees)', () => {
    const result = useSkillRadar(makeScores(4, 10));
    const first = result.points[0];
    expect(first).toBeDefined();
    if (first) {
      expect(first.x).toBeCloseTo(150, 0);
      expect(first.y).toBeLessThan(150);
    }
  });
});
