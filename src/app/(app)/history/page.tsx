'use client';
// Session history page — lists past sessions grouped by day
import Link from 'next/link';
import { Container } from '@/components/ui/Container';
import { HistoryDayGroup } from '@/components/ui/HistoryDayGroup';
import { useSessionHistory } from '@/features/session/useSessionHistory';

export default function HistoryPage() {
  const { dayGroups, isLoading, error } = useSessionHistory();

  return (
    <Container>
      <h1 className="text-2xl font-bold text-gray-900 mb-8">Session History</h1>

      {/* Loading state */}
      {isLoading && (
        <p className="text-gray-400 text-center py-12">Loading sessions...</p>
      )}

      {/* Error state */}
      {!isLoading && error !== null && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      )}

      {/* Empty state */}
      {!isLoading && error === null && dayGroups.length === 0 && (
        <div className="text-center py-16 text-gray-500">
          <p className="mb-1">No sessions yet.</p>
          <p className="mb-4">Start your first speaking session!</p>
          <Link
            href="/session/new"
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            New Session →
          </Link>
        </div>
      )}

      {/* Data state — staggered day groups */}
      {!isLoading && error === null && dayGroups.length > 0 && (() => {
        let cumulativeDelay = 0;
        return dayGroups.map((group) => {
          const delay = cumulativeDelay;
          cumulativeDelay += group.sessions.length * 80 + 100;
          return (
            <HistoryDayGroup
              key={group.dateKey}
              dayLabel={group.dayLabel}
              sessions={group.sessions}
              baseDelay={delay}
            />
          );
        });
      })()}
    </Container>
  );
}
