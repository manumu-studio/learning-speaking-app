// useDashboard — fetches dashboard data and manages focus selection in localStorage
'use client';

import { useCallback, useEffect, useState } from 'react';
import { z } from 'zod';
import type { DashboardData, MetricKey } from '../dashboard.types';

const focusStateSchema = z.object({
  focusKey: z.enum([
    'connectorRepetition',
    'structuralVariety',
    'vocabularyPrecision',
    'verbAccuracy',
    'argumentClosure',
    'fillerUsage',
    'pronunciationAccuracy',
    'prosodyScore',
    'speakingRate',
  ]),
  focusLabel: z.string(),
});

const dashboardDataSchema = z.object({
  weeklyMinutes: z.number(),
  weeklySessionCount: z.number(),
  totalSessions: z.number(),
  currentStreak: z.number(),
  workoutWeeks: z.number(),
  currentFocus: z.string().nullable(),
  metrics: z.array(z.object({
    key: z.enum([
      'connectorRepetition',
      'structuralVariety',
      'vocabularyPrecision',
      'verbAccuracy',
      'argumentClosure',
      'fillerUsage',
      'pronunciationAccuracy',
      'prosodyScore',
      'speakingRate',
    ]),
    label: z.string(),
    currentLevel: z.enum(['low', 'medium', 'high']),
    currentScore: z.number(),
    trend: z.enum(['improving', 'stable', 'declining']),
    history: z.array(z.number()),
    lastTrainedToday: z.boolean().optional(),
  })),
  recentSessions: z.array(z.object({
    id: z.string(),
    createdAt: z.coerce.date(),
    intentLabel: z.string().nullable(),
    focusNext: z.string().nullable(),
  })),
  drillStats: z.object({
    totalCompleted: z.number(),
    weeklyCompleted: z.number(),
    improvementRate: z.number(),
    byMetric: z.object({
      connectorRepetition: z.number(),
      structuralVariety: z.number(),
      vocabularyPrecision: z.number(),
      verbAccuracy: z.number(),
      argumentClosure: z.number(),
      fillerUsage: z.number(),
      pronunciationAccuracy: z.number(),
      prosodyScore: z.number(),
      speakingRate: z.number(),
    }),
  }),
  personalRecords: z.array(
    z.object({
      metricKey: z.enum([
        'connectorRepetition',
        'structuralVariety',
        'vocabularyPrecision',
        'verbAccuracy',
        'argumentClosure',
        'fillerUsage',
        'pronunciationAccuracy',
        'prosodyScore',
        'speakingRate',
      ]),
      metricLabel: z.string(),
      score: z.number(),
      timeframe: z.enum(['14-day', '30-day', 'all-time']),
      previousBest: z.number().nullable(),
      sessionDate: z.string(),
    }),
  ),
  totalWorkoutCount: z.number(),
  recentProsodyPitchPreview: z.array(z.number()).default([]),
});

const FOCUS_STORAGE_KEY = 'lsa-focus';

type FocusState = {
  focusKey: MetricKey;
  focusLabel: string;
} | null;

type UseDashboardReturn = {
  data: DashboardData | null;
  isLoading: boolean;
  error: string | null;
  focus: FocusState;
  setFocus: (key: MetricKey, label: string) => void;
  clearFocus: () => void;
};

export function useDashboard(): UseDashboardReturn {
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [focus, setFocusState] = useState<FocusState>(null);

  // Load focus from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(FOCUS_STORAGE_KEY);
      if (stored) {
        const parsed: unknown = JSON.parse(stored);
        if (
          typeof parsed === 'object' &&
          parsed !== null &&
          'focusKey' in parsed &&
          'focusLabel' in parsed
        ) {
          const result = focusStateSchema.safeParse(parsed);
          if (result.success) {
            setFocusState(result.data);
          }
        }
      }
    } catch {
      // Ignore invalid localStorage data
    }
  }, []);

  // Fetch dashboard data
  useEffect(() => {
    async function fetchDashboard() {
      try {
        setIsLoading(true);
        const response = await fetch('/api/dashboard');

        if (!response.ok) {
          throw new Error(`Failed to load dashboard: ${response.status}`);
        }

        const json: unknown = await response.json();
        const dashboardParsed = dashboardDataSchema.parse(json);
        setData(dashboardParsed);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setIsLoading(false);
      }
    }

    void fetchDashboard();
  }, []);

  const setFocus = useCallback((key: MetricKey, label: string) => {
    const newFocus: FocusState = { focusKey: key, focusLabel: label };
    setFocusState(newFocus);
    localStorage.setItem(FOCUS_STORAGE_KEY, JSON.stringify(newFocus));
  }, []);

  const clearFocus = useCallback(() => {
    setFocusState(null);
    localStorage.removeItem(FOCUS_STORAGE_KEY);
  }, []);

  return { data, isLoading, error, focus, setFocus, clearFocus };
}
