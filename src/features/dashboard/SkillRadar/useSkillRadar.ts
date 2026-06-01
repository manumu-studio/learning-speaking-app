// Compute SVG polygon coordinates for radar chart axes
import { useMemo } from 'react';
import type { RadarScore } from './SkillRadar.types';

const CENTER = 150;
const RADIUS = 120;
const MAX_SCORE = 10;

interface RadarPoint {
  x: number;
  y: number;
  labelX: number;
  labelY: number;
  label: string;
  score: number;
}

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

function computePoint(index: number, total: number, score: number): { x: number; y: number } {
  const angle = toRadians((360 / total) * index - 90);
  const r = (score / MAX_SCORE) * RADIUS;
  return {
    x: CENTER + r * Math.cos(angle),
    y: CENTER + r * Math.sin(angle),
  };
}

function computeLabelPosition(index: number, total: number): { labelX: number; labelY: number } {
  const angle = toRadians((360 / total) * index - 90);
  const labelR = RADIUS + 18;
  return {
    labelX: CENTER + labelR * Math.cos(angle),
    labelY: CENTER + labelR * Math.sin(angle),
  };
}

export function useSkillRadar(scores: RadarScore[]) {
  return useMemo(() => {
    const total = scores.length;
    if (total === 0) return { points: [], scorePath: '', thresholdPath: '', gridPaths: [] };

    const points: RadarPoint[] = scores.map((s, i) => {
      const { x, y } = computePoint(i, total, s.score);
      const { labelX, labelY } = computeLabelPosition(i, total);
      return { x, y, labelX, labelY, label: s.label, score: s.score };
    });

    const scorePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ') + ' Z';

    const thresholdPoints = scores.map((s, i) => computePoint(i, total, s.c2Threshold));
    const thresholdPath = thresholdPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ') + ' Z';

    // Grid rings at 25%, 50%, 75%
    const gridPaths = [2.5, 5, 7.5].map((level) => {
      const ring = scores.map((_, i) => computePoint(i, total, level));
      return ring.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ') + ' Z';
    });

    return { points, scorePath, thresholdPath, gridPaths };
  }, [scores]);
}
