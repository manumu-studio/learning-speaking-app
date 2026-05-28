// Types for the TodaysWorkout hero card component

import type { MetricKey } from '@/features/dashboard/dashboard.types';
import type { WorkoutRecommendation } from '@/features/dashboard/todaysWorkout';

export interface TodaysWorkoutProps {
  /** Derived recommendation — drives which render state is shown */
  recommendation: WorkoutRecommendation;
  /**
   * Non-null when the recommended metric was trained today (completion state).
   */
  completedMetricKey: MetricKey | null;
  /** Total sessions count — displayed as "Workout #N" */
  workoutNumber: number;
  className?: string | undefined;
}

export interface UseTodaysWorkoutReturn {
  recommendation: WorkoutRecommendation;
  completedMetricKey: MetricKey | null;
  workoutNumber: number;
}
