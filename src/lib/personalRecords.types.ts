// Type definitions for Personal Records detection

import type { MetricKey } from '@/features/dashboard/dashboard.types';

export type PRTimeframe = '14-day' | '30-day' | 'all-time';

/** A metric where the current session achieved a new personal best. */
export interface PersonalRecord {
  metricKey: MetricKey;
  metricLabel: string;
  /** The current session's score that set the PR */
  score: number;
  /** Most specific timeframe beaten — 'all-time' > '30-day' > '14-day' */
  timeframe: PRTimeframe;
  /** Previous best in the same timeframe, null if this is the user's first score for this metric */
  previousBest: number | null;
  /** ISO date string of the session that set the PR */
  sessionDate: string;
}
