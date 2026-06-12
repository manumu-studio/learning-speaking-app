// Dashboard feature type definitions
export type {
  MetricKey,
  MetricLevel,
  PronunciationMetricKey,
} from '@/lib/metrics/metrics.types';
export { PRONUNCIATION_METRIC_KEYS } from '@/lib/metrics/metrics.types';

import type { MetricKey, MetricLevel } from '@/lib/metrics/metrics.types';
import type { PersonalRecord } from '@/lib/personalRecords.types';
import type { CefrEstimate } from '@/lib/cefr/cefr.types';
import type { RadarScore } from '@/features/dashboard/SkillRadar';

/** One metric dimension with level, numeric score, and short coaching note. */
export type MetricScore = {
  key: MetricKey;
  level: MetricLevel;
  score: number;
  note: string;
};

export type TrendDirection = 'improving' | 'stable' | 'declining';

/** Per-metric card on the dashboard: current score, band, sparkline history, and drill linkage. */
export type DashboardMetric = {
  key: MetricKey;
  label: string;
  currentLevel: MetricLevel;
  currentScore: number;
  trend: TrendDirection;
  history: number[];
  lastTrainedToday?: boolean | undefined;
};

/** Compact row for “recent activity” — pairs with streak / focus copy on the home dashboard. */
export type RecentSession = {
  id: string;
  createdAt: Date;
  intentLabel: string | null;
  focusNext: string | null;
};

/** Aggregates from `DrillAttempt` for the training strip (counts and improvement rate). */
export type DrillStatsData = {
  totalCompleted: number;
  weeklyCompleted: number;
  improvementRate: number;
  byMetric: Record<MetricKey, number>;
};

/** Everything `getDashboardData` returns for the authenticated user (serialized to JSON for the API). */
export type DashboardData = {
  weeklyMinutes: number;
  weeklySessionCount: number;
  totalSessions: number;
  currentStreak: number;
  workoutWeeks: number;
  currentFocus: string | null;
  metrics: DashboardMetric[];
  recentSessions: RecentSession[];
  drillStats: DrillStatsData;
  personalRecords: PersonalRecord[];
  totalWorkoutCount: number;
  /** Downsampled F0 preview from the most recent session with pitch data */
  recentProsodyPitchPreview: number[];
  cefrEstimate: CefrEstimate | null;
  radarScores: RadarScore[];
};
