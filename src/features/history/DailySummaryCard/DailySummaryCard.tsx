// Subtle daily summary card — shows overall score, topic sentence, and "use tomorrow" pills
'use client';

import type { DailySummaryCardProps } from './DailySummaryCard.types';
import { useDailySummaryCard } from './useDailySummaryCard';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDateLabel(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00');
  return date
    .toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    .toUpperCase();
}

function formatMinutes(totalSecs: number): string {
  const mins = Math.round(totalSecs / 60);
  return `${mins} min`;
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function SummarySkeleton() {
  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-800 p-4 animate-pulse">
      <div className="h-3 w-32 bg-gray-200 dark:bg-gray-700 rounded" />
      <div className="h-7 w-20 bg-gray-200 dark:bg-gray-700 rounded mt-3" />
      <div className="h-4 w-full bg-gray-200 dark:bg-gray-700 rounded mt-3" />
      <div className="flex gap-1.5 mt-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-5 w-16 bg-gray-200 dark:bg-gray-700 rounded-full" />
        ))}
      </div>
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function DailySummaryCard({ dateKey, onTapDay }: DailySummaryCardProps) {
  const { summary, isLoading, error } = useDailySummaryCard(dateKey);

  if (isLoading) return <SummarySkeleton />;
  if (error !== null || summary === null) return null;

  const formattedDate = formatDateLabel(summary.date);
  const duration = formatMinutes(summary.totalDurationSecs);

  return (
    <div
      onClick={() => onTapDay?.(dateKey)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter') onTapDay?.(dateKey);
      }}
      className="cursor-pointer rounded-lg border border-gray-200 dark:border-gray-800 p-4 hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
    >
      {/* Date + session meta */}
      <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">
        {formattedDate} · {summary.sessionCount} sessions · {duration}
      </p>

      {/* Overall score */}
      <div className="flex items-baseline mt-2">
        <span className="text-sm text-gray-500 dark:text-gray-400 mr-2">Overall</span>
        <span className="text-2xl font-bold text-gray-800 dark:text-gray-100">
          {summary.overallScore.toFixed(1)}
        </span>
      </div>

      {/* Topic sentence */}
      <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 leading-relaxed">
        {summary.topicSentence}
      </p>

      {/* Use tomorrow pills */}
      {summary.activeTargetsTomorrow.length > 0 && (
        <div className="mt-3">
          <span className="text-xs text-gray-400 dark:text-gray-500">Use tomorrow</span>
          <div className="flex flex-wrap gap-1.5 mt-1">
            {summary.activeTargetsTomorrow.map((target) => (
              <span
                key={target}
                className="text-xs px-2.5 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300"
              >
                {target}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
