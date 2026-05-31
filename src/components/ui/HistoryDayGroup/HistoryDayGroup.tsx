// Day group in history — shows date header and list of session cards
import { HistorySessionCard } from '@/components/ui/HistorySessionCard';
import type { HistoryDayGroupProps } from './HistoryDayGroup.types';

export function HistoryDayGroup({ dayLabel, sessions, baseDelay = 0, onDeleteSession }: HistoryDayGroupProps) {
  const count = sessions.length;
  const countLabel = count === 1 ? '1 session' : `${count} sessions`;

  return (
    <div className="mb-8">
      <h3 className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3 pl-1 flex items-center gap-2">
        <span>{dayLabel}</span>
        <span className="text-gray-300 dark:text-gray-600" aria-hidden="true">·</span>
        <span>{countLabel}</span>
      </h3>
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
    </div>
  );
}
