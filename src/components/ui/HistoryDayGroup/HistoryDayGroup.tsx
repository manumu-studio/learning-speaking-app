// Day group in history — shows date header, optional daily summary, and session cards
'use client';

import { HistorySessionCard } from '@/components/ui/HistorySessionCard';
import { DailySummaryCard } from '@/features/history/DailySummaryCard';
import type { HistoryDayGroupProps } from './HistoryDayGroup.types';

function isBeforeDailyCutoff(): boolean {
  return new Date().getHours() < 22;
}

export function HistoryDayGroup({
  dayLabel,
  dateKey,
  sessions,
  isToday = true,
  baseDelay = 0,
  onDeleteSession,
  onTapDay,
}: HistoryDayGroupProps) {
  const showOpenToday = isToday && isBeforeDailyCutoff();
  const count = sessions.length;
  const countLabel = count === 1 ? '1 session' : `${count} sessions`;

  return (
    <div className="mb-8">
      <h3 className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3 pl-1 flex items-center gap-2">
        <span>{dayLabel}</span>
        <span className="text-gray-300 dark:text-gray-600" aria-hidden="true">·</span>
        <span>{countLabel}</span>
      </h3>

      {!showOpenToday && (
        <DailySummaryCard
          dateKey={dateKey}
          {...(onTapDay !== undefined ? { onTapDay } : {})}
        />
      )}

      {/* Today's sessions expand inline; past days navigate to Day Detail */}
      {showOpenToday && (
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
