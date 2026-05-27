// Fetches recent sessions and counts how many were recorded today
'use client';

import { useEffect, useState } from 'react';
import { z } from 'zod';
import type { UseRecordingContextReturn } from './RecordingContext.types';

const sessionsApiResponseSchema = z.object({
  sessions: z.array(
    z.object({
      id: z.string(),
      createdAt: z.string(),
    }),
  ),
  total: z.number(),
  page: z.number(),
  limit: z.number(),
});

function isSameCalendarDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function countSessionsToday(createdAtValues: readonly string[]): number {
  const today = new Date();
  return createdAtValues.filter((iso) =>
    isSameCalendarDay(new Date(iso), today),
  ).length;
}

export function useRecordingContext(): UseRecordingContextReturn {
  const [todaySessionCount, setTodaySessionCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchContext() {
      try {
        const res = await fetch('/api/sessions?limit=10');
        if (!res.ok) {
          throw new Error(`Failed to load sessions (${res.status})`);
        }

        const data = sessionsApiResponseSchema.parse(await res.json());
        const count = countSessionsToday(data.sessions.map((s) => s.createdAt));

        if (!cancelled) {
          setTodaySessionCount(count);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : 'Something went wrong loading session context.',
          );
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    void fetchContext();

    return () => {
      cancelled = true;
    };
  }, []);

  return {
    todaySessionCount,
    nextRecordingNumber: todaySessionCount + 1,
    isLoading,
    error,
  };
}
