// Day group in history — shows date header and list of session cards
import { HistorySessionCard } from '@/components/ui/HistorySessionCard';
import type { HistoryDayGroupProps } from './HistoryDayGroup.types';

export function HistoryDayGroup({ dayLabel, sessions, baseDelay = 0 }: HistoryDayGroupProps) {
  return (
    <div className="space-y-2 mb-8">
      <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-3 pl-1">
        {dayLabel}
      </h3>
      {sessions.map((session, index) => (
        <HistorySessionCard
          key={session.id}
          {...session}
          animationDelay={baseDelay + index * 80}
        />
      ))}
    </div>
  );
}
