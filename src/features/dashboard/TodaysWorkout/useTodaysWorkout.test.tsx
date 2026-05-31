// Tests for useTodaysWorkout — workout recommendation derivation
import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { DashboardData } from '@/features/dashboard/dashboard.types';
import type { PromptEntry } from '@/features/dashboard/todaysWorkout';
import { useTodaysWorkout } from './useTodaysWorkout';

const mockPrompts: PromptEntry[] = [
  { id: 'p1', metricKey: 'fillerUsage', title: 'Morning Routine', prompt: 'Describe your morning routine' },
];

function makeDashboardData(overrides: Partial<DashboardData> = {}): DashboardData {
  return {
    metrics: [
      {
        key: 'fillerUsage',
        label: 'Filler Usage',
        currentScore: 6,
        currentLevel: 'medium',
        trend: 'stable',
        history: [6, 5, 6],
        lastTrainedToday: false,
      },
    ],
    weeklyMinutes: 30,
    weeklySessionCount: 4,
    totalSessions: 12,
    currentStreak: 3,
    currentFocus: 'fillerUsage',
    personalRecords: [],
    recentProsodyPitchPreview: [],
    recentSessions: [],
    workoutWeeks: 2,
    totalWorkoutCount: 12,
    drillStats: {
      totalCompleted: 5,
      weeklyCompleted: 2,
      improvementRate: 60,
      byMetric: {} as DashboardData['drillStats']['byMetric'],
    },
    ...overrides,
  };
}

describe('useTodaysWorkout', () => {
  it('returns welcome recommendation when data is null', () => {
    const { result } = renderHook(() => useTodaysWorkout(null, mockPrompts));
    expect(result.current.recommendation.kind).toBe('welcome');
  });

  it('returns workout number from totalSessions', () => {
    const data = makeDashboardData({ totalSessions: 42 });
    const { result } = renderHook(() => useTodaysWorkout(data, mockPrompts));
    expect(result.current.workoutNumber).toBe(42);
  });

  it('returns null completedMetricKey when not workout kind', () => {
    const { result } = renderHook(() => useTodaysWorkout(null, mockPrompts));
    expect(result.current.completedMetricKey).toBeNull();
  });

  it('returns null completedMetricKey when metric not trained today', () => {
    const data = makeDashboardData();
    const { result } = renderHook(() => useTodaysWorkout(data, mockPrompts));
    expect(result.current.completedMetricKey).toBeNull();
  });
});
