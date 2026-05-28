// PillarTrendCard — displays pillar trend chart with expandable per-metric drill-down
'use client';

import { TrendChart } from '@/components/ui/TrendChart';
import type { TrendDataItem } from '@/components/ui/TrendChart';
import { PillarDeltaBadge } from '../PillarDeltaBadge';
import { usePillarTrendCard } from './usePillarTrendCard';
import type { PillarTrendCardProps } from './PillarTrendCard.types';

/** Compute average of the last 7 values in a series (or fewer if not enough data). */
function computeCurrentAvg(series: readonly TrendDataItem[]): number | null {
  if (series.length === 0) return null;
  const tail = series.slice(-7);
  const sum = tail.reduce((acc, item) => acc + item.value, 0);
  return Math.round((sum / tail.length) * 10) / 10;
}

export function PillarTrendCard({ pillar, range }: PillarTrendCardProps) {
  const { isExpanded, toggleExpanded } = usePillarTrendCard();

  const currentAvg = computeCurrentAvg(pillar.series);

  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          {pillar.label}
        </h3>
        <PillarDeltaBadge delta={pillar.deltaPercent} range={range} />
        {currentAvg !== null && (
          <span className="ml-auto text-sm font-medium text-gray-500 dark:text-gray-400">
            Avg {currentAvg.toFixed(1)}
          </span>
        )}
      </div>

      {/* Main pillar trend chart */}
      <TrendChart
        data={[...pillar.series]}
        color={pillar.color}
        height={180}
        showTrendLine
        ariaLabel={`${pillar.label} trend over time`}
      />

      {/* Expand toggle */}
      {pillar.metricSeries.length > 0 && (
        <>
          <button
            type="button"
            onClick={toggleExpanded}
            aria-expanded={isExpanded}
            className="mt-4 text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
          >
            {isExpanded ? 'Hide metrics' : 'Show metrics'}
          </button>

          {/* Per-metric drill-down */}
          {isExpanded && (
            <div className="mt-4 space-y-4 border-t border-gray-100 dark:border-gray-800 pt-4">
              {pillar.metricSeries.map((metric) => (
                <div key={metric.metricKey}>
                  <p className="mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">
                    {metric.label}
                  </p>
                  {metric.series.length > 0 ? (
                    <TrendChart
                      data={[...metric.series]}
                      color={pillar.color}
                      height={90}
                      showTrendLine={false}
                      ariaLabel={`${metric.label} trend`}
                    />
                  ) : (
                    <p className="text-xs text-gray-400 dark:text-gray-500">
                      No data yet
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
