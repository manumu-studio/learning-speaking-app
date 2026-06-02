// MetricCard — interactive metric display with level badge, trend, and sparkline
'use client';
/* eslint-disable max-lines-per-function */

import { ScoreChip } from '@/components/ui/ScoreChip';
import { SparkLine } from '@/components/ui/SparkLine';
import type { MetricCardProps } from './MetricCard.types';
import type { MetricLevel, TrendDirection } from '../dashboard.types';

const TREND_DISPLAY: Record<TrendDirection, { arrow: string; color: string }> = {
  improving: { arrow: '\u2191', color: 'text-green-600' },
  stable: { arrow: '\u2192', color: 'text-slate-400' },
  declining: { arrow: '\u2193', color: 'text-amber-500' },
};

const SPARKLINE_COLORS: Record<MetricLevel, string> = {
  low: '#22c55e',    // green-500
  medium: '#f59e0b', // amber-500
  high: '#3b82f6',   // blue-500
};

export function MetricCard({
  metricKey,
  label,
  currentLevel,
  currentScore,
  trend,
  history,
  isSelected,
  onSelect,
  lastTrainedToday,
  drillCount = 0,
  pitchPreview,
}: MetricCardProps) {
  const trendDisplay = TREND_DISPLAY[trend];
  const isSelectable = onSelect !== undefined;

  const cardClassName = `
    w-full rounded-xl border p-4 text-left transition-all duration-200
    ${isSelectable ? 'hover:shadow-md hover:border-blue-200 dark:hover:border-blue-700' : 'cursor-default'}
    ${isSelected
      ? 'border-blue-400 bg-blue-50/50 shadow-sm dark:border-blue-600 dark:bg-blue-950/50'
      : 'border-slate-100 bg-white dark:border-slate-700 dark:bg-gray-900'
    }
  `;

  const cardContent = (
    <>
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">{label}</h3>
          <div className="mt-1 flex items-center gap-2">
            <ScoreChip score={currentScore} scale="ten" />
            {lastTrainedToday && (
              <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                Last trained: today
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-lg font-bold text-slate-700 dark:text-slate-300">
            {currentScore}
          </span>
          <span className={`text-sm ${trendDisplay.color}`}>
            {trendDisplay.arrow}
          </span>
        </div>
      </div>
      <div className="mt-3">
        <SparkLine
          data={history}
          color={SPARKLINE_COLORS[currentLevel]}
          width={160}
          height={28}
        />
      </div>
      {pitchPreview !== undefined && pitchPreview.length > 1 && (
        <div className="mt-2">
          <p className="mb-1 text-xs text-slate-500 dark:text-slate-400">Recent pitch contour</p>
          <SparkLine
            data={pitchPreview}
            color="#8b5cf6"
            width={160}
            height={24}
          />
        </div>
      )}
      {drillCount > 0 ? (
        <span className="mt-2 flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
          <svg
            width="12"
            height="12"
            viewBox="0 0 12 12"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden
          >
            <rect x="1" y="4" width="2" height="4" rx="0.5" fill="currentColor" />
            <rect x="9" y="4" width="2" height="4" rx="0.5" fill="currentColor" />
            <rect x="3" y="5" width="6" height="2" rx="0.5" fill="currentColor" />
          </svg>
          {drillCount} drill{drillCount !== 1 ? 's' : ''}
        </span>
      ) : null}
    </>
  );

  if (!isSelectable) {
    return (
      <div className={cardClassName} aria-label={label}>
        {cardContent}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => onSelect(metricKey)}
      aria-label={`Select ${label} as training focus`}
      className={cardClassName}
    >
      {cardContent}
    </button>
  );
}
