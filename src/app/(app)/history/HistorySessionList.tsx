// Session day groups list with infinite scroll sentinel for the history page
'use client';

import type { RefObject } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { HistoryDayGroup } from '@/components/ui/HistoryDayGroup';
import type { DayGroup } from '@/features/session/useSessionHistory.types';

interface HistoryEmptyProps {
  error: string | null;
}

export function HistoryEmpty({ error }: HistoryEmptyProps) {
  if (error !== null) {
    return (
      <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
        <p className="text-amber-700 dark:text-amber-400 text-sm">{error}</p>
      </div>
    );
  }
  return (
    <div className="text-center py-16">
      <p className="text-gray-500 dark:text-gray-400 mb-1 text-lg font-medium">
        No sessions yet
      </p>
      <p className="text-gray-400 dark:text-gray-500 mb-6 text-sm">
        Every rep counts. Start your first workout to track your progress.
      </p>
      <Link
        href="/session/new"
        className="inline-flex items-center gap-2 rounded-full bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 px-6 py-2.5 text-sm font-semibold hover:opacity-90 transition-opacity"
      >
        Start a session →
      </Link>
    </div>
  );
}

interface HistorySessionListProps {
  dayGroups: DayGroup[];
  hasMore: boolean;
  isFetchingMore: boolean;
  sentinelRef: RefObject<HTMLDivElement | null>;
  onDeleteSession: (sessionId: string) => void;
}

export function HistorySessionList({
  dayGroups,
  hasMore,
  isFetchingMore,
  sentinelRef,
  onDeleteSession,
}: HistorySessionListProps) {
  const today = new Date().toISOString().split('T')[0];
  const router = useRouter();

  return (
    <>
      {dayGroups.map((group, groupIndex) => (
        <HistoryDayGroup
          key={group.dateKey}
          dayLabel={group.dayLabel}
          dateKey={group.dateKey}
          sessions={group.sessions}
          isToday={group.dateKey === today}
          baseDelay={groupIndex * 100}
          onDeleteSession={onDeleteSession}
          onTapDay={(date) => router.push(`/history/day/${date}`)}
        />
      ))}

      <div ref={sentinelRef} aria-hidden="true" className="h-4" />

      {isFetchingMore && (
        <p
          className="text-gray-400 dark:text-gray-500 text-center py-6 text-sm"
          aria-live="polite"
          role="status"
        >
          Loading more sessions...
        </p>
      )}

      {!hasMore && !isFetchingMore && (
        <p className="text-gray-300 dark:text-gray-600 text-center py-6 text-xs">
          You&apos;ve seen all sessions
        </p>
      )}
    </>
  );
}
