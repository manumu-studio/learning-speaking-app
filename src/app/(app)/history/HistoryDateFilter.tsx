// Date range filter pill buttons for the history page
'use client';

import type { DateFilter } from '@/features/session/useSessionHistory.types';

const DATE_FILTERS = [
  { value: 'all', label: 'All time' },
  { value: '30d', label: 'Last 30 days' },
  { value: '7d', label: 'Last 7 days' },
] as const satisfies ReadonlyArray<{ value: DateFilter; label: string }>;

interface HistoryDateFilterProps {
  dateFilter: DateFilter;
  onFilterChange: (value: DateFilter) => void;
}

export function HistoryDateFilter({ dateFilter, onFilterChange }: HistoryDateFilterProps) {
  return (
    <div className="flex gap-2 mb-8" role="group" aria-label="Date range filter">
      {DATE_FILTERS.map((f) => (
        <button
          key={f.value}
          type="button"
          onClick={() => onFilterChange(f.value)}
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
  );
}
