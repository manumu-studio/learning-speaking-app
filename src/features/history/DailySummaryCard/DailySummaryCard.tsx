// Daily summary card — pillar score chips, new words, and AI coaching feedback
'use client';

import type { DailySummaryCardProps } from './DailySummaryCard.types';
import { useDailySummaryCard } from './useDailySummaryCard';

const PILLAR_CHIPS = [
  { key: 'deliveryAvg' as const, label: 'Delivery', color: 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300' },
  { key: 'languageAvg' as const, label: 'Language', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' },
  { key: 'pronunciationAvg' as const, label: 'Pronunciation', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' },
] as const;

function SummarySkeleton() {
  return (
    <div className="rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50 p-4 mb-3 animate-pulse">
      <div className="flex gap-2 mb-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-6 w-24 rounded-full bg-gray-200 dark:bg-gray-700" />
        ))}
      </div>
      <div className="h-4 w-3/4 rounded bg-gray-200 dark:bg-gray-700 mb-2" />
      <div className="h-4 w-1/2 rounded bg-gray-200 dark:bg-gray-700" />
    </div>
  );
}

export function DailySummaryCard({ dateKey }: DailySummaryCardProps) {
  const { summary, isLoading, error } = useDailySummaryCard(dateKey);

  if (isLoading) return <SummarySkeleton />;
  if (error !== null || summary === null) return null;

  return (
    <div className="rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50 p-4 mb-3">
      {/* Pillar score chips */}
      <div className="flex flex-wrap gap-2 mb-3">
        {PILLAR_CHIPS.map((pillar) => (
          <span
            key={pillar.key}
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${pillar.color}`}
          >
            {pillar.label}
            <span className="font-semibold">{summary[pillar.key].toFixed(1)}</span>
          </span>
        ))}
      </div>

      {/* New words */}
      {summary.newWords.length > 0 && (
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
          <span className="font-medium text-gray-600 dark:text-gray-300">New words:</span>{' '}
          {summary.newWords.join(', ')}
        </p>
      )}

      {/* AI coaching feedback */}
      <p className="text-sm italic text-gray-500 dark:text-gray-400 leading-relaxed">
        {summary.feedback}
      </p>
    </div>
  );
}
