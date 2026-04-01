'use client';
// Hook for fetching session history and grouping by day
import { useEffect, useState } from 'react';
import { z } from 'zod';
import type { DayGroup, HistorySession, UseSessionHistoryReturn } from './useSessionHistory.types';

const sessionsApiResponseSchema = z.object({
  sessions: z.array(z.object({
    id: z.string(),
    status: z.string(),
    durationSecs: z.number().nullable(),
    language: z.string(),
    topic: z.string().nullable(),
    intentLabel: z.string().nullable(),
    summary: z.string().nullable(),
    createdAt: z.string(),
    updatedAt: z.string(),
  })),
  total: z.number(),
  page: z.number(),
  limit: z.number(),
});

function getDayLabel(dateString: string): string {
  const date = new Date(dateString);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  const isSameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  if (isSameDay(date, today)) return 'Today';
  if (isSameDay(date, yesterday)) return 'Yesterday';

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function getDateKey(dateString: string): string {
  return new Date(dateString).toISOString().split('T')[0] ?? dateString;
}

function groupSessionsByDay(sessions: HistorySession[]): DayGroup[] {
  const map = new Map<string, DayGroup>();

  for (const session of sessions) {
    const dateKey = getDateKey(session.createdAt);
    const existing = map.get(dateKey);

    if (existing !== undefined) {
      existing.sessions.push(session);
    } else {
      map.set(dateKey, {
        dayLabel: getDayLabel(session.createdAt),
        dateKey,
        sessions: [session],
      });
    }
  }

  // Sort sessions within each group newest-first
  for (const group of map.values()) {
    group.sessions.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }

  // Sort day groups newest-first
  return Array.from(map.values()).sort((a, b) => b.dateKey.localeCompare(a.dateKey));
}

export function useSessionHistory(): UseSessionHistoryReturn {
  const [dayGroups, setDayGroups] = useState<DayGroup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function fetchHistory() {
      try {
        const res = await fetch('/api/sessions?limit=50');

        if (!res.ok) {
          throw new Error(`Failed to load sessions (${res.status})`);
        }

        const data = sessionsApiResponseSchema.parse(await res.json());

        if (!cancelled) {
          setDayGroups(groupSessionsByDay(data.sessions));
          setTotal(data.total);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Something went wrong loading your sessions.');
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    void fetchHistory();

    return () => {
      cancelled = true;
    };
  }, []);

  return { dayGroups, isLoading, error, total };
}
