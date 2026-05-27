'use client';
// Hook for fetching session history with cursor pagination and infinite scroll
import { useCallback, useEffect, useRef, useState } from 'react';
import { z } from 'zod';
import type {
  DateFilter,
  DayGroup,
  SessionListItem,
  UseSessionHistoryReturn,
} from './useSessionHistory.types';

const SessionListItemSchema = z.object({
  id: z.string(),
  status: z.string(),
  intentLabel: z.string().nullable(),
  topic: z.string().nullable(),
  durationSecs: z.number().nullable(),
  wordCount: z.number().nullable(),
  createdAt: z.string(),
  overallScore: z.number().nullable(),
  pronunciationScore: z.number().nullable(),
  workoutNumber: z.number(),
});

const SessionListResponseSchema = z.object({
  sessions: z.array(SessionListItemSchema),
  nextCursor: z.string().nullable(),
  nextCursorId: z.string().nullable(),
  total: z.number(),
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

function groupSessionsByDay(sessions: SessionListItem[]): DayGroup[] {
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

  for (const group of map.values()) {
    group.sessions.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }

  return Array.from(map.values()).sort((a, b) => b.dateKey.localeCompare(a.dateKey));
}

export function useSessionHistory(): UseSessionHistoryReturn {
  const [sessions, setSessions] = useState<SessionListItem[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [cursorId, setCursorId] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const fetchingRef = useRef(false);

  const fetchPage = useCallback(
    async (opts: { cursor: string | null; cursorId: string | null; reset: boolean }) => {
      if (fetchingRef.current) return;
      fetchingRef.current = true;

      const isFetchMore = !opts.reset;
      if (isFetchMore) setIsFetchingMore(true);
      else setIsLoading(true);

      try {
        const params = new URLSearchParams({
          limit: '10',
          dateFilter,
          isOnboarding: 'false',
        });
        if (opts.cursor !== null) params.set('cursor', opts.cursor);
        if (opts.cursorId !== null) params.set('cursorId', opts.cursorId);

        const res = await fetch(`/api/sessions?${params.toString()}`);
        if (!res.ok) throw new Error(`Failed to load sessions (${res.status})`);

        const data = SessionListResponseSchema.parse(await res.json());

        setSessions((prev) => (opts.reset ? data.sessions : [...prev, ...data.sessions]));
        setCursor(data.nextCursor);
        setCursorId(data.nextCursorId);
        setHasMore(data.nextCursor !== null);
        setTotal(data.total);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Something went wrong loading your sessions.');
      } finally {
        fetchingRef.current = false;
        setIsLoading(false);
        setIsFetchingMore(false);
      }
    },
    [dateFilter],
  );

  useEffect(() => {
    setCursor(null);
    setCursorId(null);
    setSessions([]);
    setHasMore(true);
    void fetchPage({ cursor: null, cursorId: null, reset: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateFilter]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (sentinel === null) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry?.isIntersecting && hasMore && !fetchingRef.current) {
          void fetchPage({ cursor, cursorId, reset: false });
        }
      },
      { threshold: 0.1 },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [cursor, cursorId, hasMore, fetchPage]);

  const dayGroups = groupSessionsByDay(sessions);

  return {
    sessions,
    dayGroups,
    isLoading,
    isFetchingMore,
    error,
    hasMore,
    total,
    dateFilter,
    setDateFilter,
    sentinelRef,
  };
}
