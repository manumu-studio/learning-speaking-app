// Vocabulary statistics dashboard — totals, domain breakdown, adoption rate
'use client';

import type { VocabStatsProps } from './VocabStats.types';
import { useVocabStats } from './useVocabStats';

export function VocabStats({ className }: VocabStatsProps) {
  const { stats, isLoading } = useVocabStats();

  if (isLoading) {
    return <div className={`h-24 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800 ${className ?? ''}`} />;
  }

  if (stats === null) return null;

  const adoptionPct = Math.round(stats.adoptionRate * 100);

  return (
    <div className={`rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900 ${className ?? ''}`}>
      <div className="flex flex-wrap gap-4 text-sm">
        <div>
          <span className="font-medium text-gray-900 dark:text-gray-100">{stats.totalItems}</span>
          <span className="ml-1 text-gray-500 dark:text-gray-400">total</span>
        </div>
        <div>
          <span className="font-medium text-gray-900 dark:text-gray-100">{stats.dueCount}</span>
          <span className="ml-1 text-gray-500 dark:text-gray-400">due</span>
        </div>
        <div>
          <span className="font-medium text-gray-900 dark:text-gray-100">{stats.adoptedCount}</span>
          <span className="ml-1 text-gray-500 dark:text-gray-400">adopted ({adoptionPct}%)</span>
        </div>
        {stats.averageInterval > 0 && (
          <div>
            <span className="font-medium text-gray-900 dark:text-gray-100">{Math.round(stats.averageInterval)}d</span>
            <span className="ml-1 text-gray-500 dark:text-gray-400">avg interval</span>
          </div>
        )}
      </div>

      {stats.domainBreakdown.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {stats.domainBreakdown.map((d) => (
            <span key={d.domain} className="rounded-full bg-violet-50 px-2 py-0.5 text-xs text-violet-700 dark:bg-violet-900/20 dark:text-violet-300">
              {d.domain} {d.count}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
