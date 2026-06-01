// Day group in history — shows date header, optional daily summary, and session cards
'use client';

import { useState } from 'react';
import { HistorySessionCard } from '@/components/ui/HistorySessionCard';
import { DailySummaryCard } from '@/features/history/DailySummaryCard';
import type { HistoryDayGroupProps } from './HistoryDayGroup.types';

export function HistoryDayGroup({
  dayLabel,
  dateKey,
  sessions,
  isToday = true,
  baseDelay = 0,
  onDeleteSession,
}: HistoryDayGroupProps) {
  const [expanded, setExpanded] = useState(isToday);
  const count = sessions.length;
  const countLabel = count === 1 ? '1 session' : `${count} sessions`;

  return (
    <div className="mb-8">
      <h3 className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3 pl-1 flex items-center gap-2">
        <span>{dayLabel}</span>
        <span className="text-gray-300 dark:text-gray-600" aria-hidden="true">·</span>
        <span>{countLabel}</span>
      </h3>

      {/* Daily summary — shows for any day with completed sessions */}
      <DailySummaryCard dateKey={dateKey} />

      {/* Session toggle for past days */}
      {!isToday && (
        <button
          type="button"
          onClick={() => setExpanded((prev) => !prev)}
          className="text-xs font-medium text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors mb-2 pl-1"
        >
          {expanded ? 'Hide sessions' : `Show ${countLabel}`}
        </button>
      )}

      {/* Session list */}
      {expanded && (
        <ul className="list-none space-y-2 p-0 m-0" aria-label={`Speaking sessions for ${dayLabel}`}>
          {sessions.map((session, index) => (
            <li key={session.id} className="list-none">
              <HistorySessionCard
                {...session}
                animationDelay={baseDelay + index * 80}
                {...(onDeleteSession !== undefined ? { onDelete: onDeleteSession } : {})}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
