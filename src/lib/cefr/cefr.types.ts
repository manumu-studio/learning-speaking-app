// CEFR estimation types — weighted pillar scoring from metric snapshots
import type { MetricKey } from '@/features/dashboard/dashboard.types';

export type CefrLevel = 'below-c1' | 'c1-low' | 'c1-mid' | 'c1-high' | 'c2';

export type PillarBreakdown = {
  delivery: number;
  language: number;
  pronunciation: number;
};

export type CefrEstimate = {
  level: CefrLevel;
  weightedAverage: number;
  pillarBreakdown: PillarBreakdown;
};

export type MetricScoreInput = {
  key: MetricKey;
  score: number;
};
