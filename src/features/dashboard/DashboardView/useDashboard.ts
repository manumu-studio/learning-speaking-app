// useDashboard — fetches dashboard data and manages focus selection in localStorage
'use client';

import { useCallback, useEffect, useState } from 'react';
import type { DashboardData, MetricKey } from '../dashboard.types';

const FOCUS_STORAGE_KEY = 'lsa-training-focus';

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
          setFocusState(parsed as FocusState);
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
        setData(json as DashboardData);
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
