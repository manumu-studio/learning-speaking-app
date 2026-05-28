// Derives TodaysWorkout recommendation from live dashboard data
'use client';

import { useMemo } from 'react';
import type { DashboardData } from '@/features/dashboard/dashboard.types';
import type { MetricKey } from '@/features/dashboard/dashboard.types';
import {
  computeTodaysWorkout,
  type PromptEntry,
  type WorkoutRecommendation,
} from '@/features/dashboard/todaysWorkout';
import type { UseTodaysWorkoutReturn } from './TodaysWorkout.types';

export function useTodaysWorkout(
  data: DashboardData | null,
  prompts: PromptEntry[],
): UseTodaysWorkoutReturn {
  // prompts is a static import array — stable reference, no re-render cost
  const recommendation: WorkoutRecommendation = useMemo(() => {
    if (data === null) {
      return { kind: 'welcome', message: 'Loading your workout...' };
    }
    return computeTodaysWorkout(data, prompts);
  }, [data, prompts]);

  const completedMetricKey: MetricKey | null = useMemo(() => {
    if (recommendation.kind !== 'workout' || data === null) return null;
    const metric = data.metrics.find((m) => m.key === recommendation.metricKey);
    return metric?.lastTrainedToday === true ? recommendation.metricKey : null;
  }, [recommendation, data]);

  const workoutNumber = data?.totalSessions ?? 0;

  return { recommendation, completedMetricKey, workoutNumber };
}
