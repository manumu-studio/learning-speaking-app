'use client';
// Hook for fetching session history with cursor pagination and infinite scroll
import { useCallback, useEffect, useRef, useState } from 'react';
import type {
  DateFilter,
  DayGroup,
  SessionListItem,
  UseSessionHistoryReturn,
} from './useSessionHistory.types';
import { fetchSessionPage } from './sessionHistoryFetcher';

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
      if (opts.reset) setIsLoading(true);
      else setIsFetchingMore(true);
      try {
        const data = await fetchSessionPage({ cursor: opts.cursor, cursorId: opts.cursorId, dateFilter });
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

  const removeSession = useCallback((sessionId: string) => {
    setSessions((prev) => prev.filter((s) => s.id !== sessionId));
    setTotal((prev) => Math.max(0, prev - 1));
  }, []);

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
    removeSession,
  };
}
