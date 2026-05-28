'use client';
// Session history page — activity feed with Suspense boundary for search param reads
import { Suspense } from 'react';
import Link from 'next/link';
import { Container } from '@/components/ui/Container';
import { HistoryDayGroup } from '@/components/ui/HistoryDayGroup';
import { useSessionHistory } from '@/features/session/useSessionHistory';
import type { DateFilter } from '@/features/session/useSessionHistory.types';

const DATE_FILTERS = [
  { value: 'all', label: 'All time' },
  { value: '30d', label: 'Last 30 days' },
  { value: '7d', label: 'Last 7 days' },
] as const satisfies ReadonlyArray<{ value: DateFilter; label: string }>;

function HistorySkeleton() {
  return (
    <Container>
      <div className="mb-6 h-8 w-32 animate-pulse rounded bg-gray-200 dark:bg-gray-800" />
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className="mb-3 h-16 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-900"
        />
      ))}
    </Container>
  );
}

function HistoryContent() {
  const {
    dayGroups,
    isLoading,
    isFetchingMore,
    error,
    hasMore,
    total,
    dateFilter,
    setDateFilter,
    sentinelRef,
  } = useSessionHistory();

  return (
    <Container>
      <div className="flex items-baseline justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          Activity
        </h1>
        {total > 0 && (
          <span className="text-sm text-gray-400 dark:text-gray-500">
            {total} session{total !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      <div className="flex gap-2 mb-8" role="group" aria-label="Date range filter">
        {DATE_FILTERS.map((f) => (
          <button
            key={f.value}
            type="button"
            onClick={() => setDateFilter(f.value)}
            className={[
              'px-4 py-1.5 rounded-full text-sm font-medium transition-colors',
              dateFilter === f.value
                ? 'bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 border border-gray-200 dark:border-gray-700',
            ].join(' ')}
            aria-pressed={dateFilter === f.value}
          >
            {f.label}
          </button>
        ))}
      </div>

      {isLoading && (
        <p
          className="text-gray-400 dark:text-gray-500 text-center py-12"
          aria-live="polite"
          role="status"
        >
          Loading sessions...
        </p>
      )}

      {!isLoading && error !== null && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
          <p className="text-amber-700 dark:text-amber-400 text-sm">{error}</p>
        </div>
      )}

      {!isLoading && error === null && dayGroups.length === 0 && (
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
      )}

      {!isLoading && error === null && dayGroups.length > 0 && (
        <>
          {dayGroups.map((group, groupIndex) => (
            <HistoryDayGroup
              key={group.dateKey}
              dayLabel={group.dayLabel}
              sessions={group.sessions}
              baseDelay={groupIndex * 100}
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
      )}
    </Container>
  );
}

export default function HistoryPage() {
  return (
    <Suspense fallback={<HistorySkeleton />}>
      <HistoryContent />
    </Suspense>
  );
}
