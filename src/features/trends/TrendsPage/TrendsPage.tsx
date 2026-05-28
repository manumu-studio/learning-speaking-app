// TrendsPage — full-page trends view with time range picker and pillar trend cards
'use client';

import { useTrends } from '../useTrends';
import { TIME_RANGE_OPTIONS, type TimeRange } from '../trends.types';
import { PillarTrendCard } from '../PillarTrendCard';

// ---------------------------------------------------------------------------
// TimeRangePicker — inline helper for the range toggle bar
// ---------------------------------------------------------------------------

function TimeRangePicker({
  activeRange,
  onSelect,
}: {
  readonly activeRange: TimeRange;
  readonly onSelect: (range: TimeRange) => void;
}) {
  return (
    <div className="flex gap-1 rounded-lg bg-gray-100 dark:bg-gray-900 p-1" role="group" aria-label="Time range">
      {TIME_RANGE_OPTIONS.map((option) => {
        const isActive = option.value === activeRange;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => { onSelect(option.value); }}
            aria-pressed={isActive}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              isActive
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Loading skeleton
// ---------------------------------------------------------------------------

function TrendsLoadingSkeleton() {
  return (
    <div className="space-y-6">
      {Array.from({ length: 3 }, (_, i) => (
        <div
          key={i}
          className="h-64 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-100 dark:bg-gray-900 animate-pulse"
        />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function TrendsPage() {
  const { range, setRange, state } = useTrends();

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Trends
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Track how your skills evolve over time.
          </p>
        </div>
        <TimeRangePicker activeRange={range} onSelect={setRange} />
      </div>

      {/* Content states */}
      {state.status === 'loading' && <TrendsLoadingSkeleton />}

      {state.status === 'error' && (
        <div className="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 p-6 text-center">
          <p className="text-sm font-medium text-amber-700 dark:text-amber-400">
            {state.message}
          </p>
        </div>
      )}

      {state.status === 'idle' && <TrendsLoadingSkeleton />}

      {state.status === 'success' && state.pillarSeries.length === 0 && (
        <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 p-12 text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Complete a few sessions to see your trends here.
          </p>
        </div>
      )}

      {state.status === 'success' && state.pillarSeries.length > 0 && (
        <div className="space-y-6">
          {state.pillarSeries.map((pillar) => (
            <PillarTrendCard
              key={pillar.pillarKey}
              pillar={pillar}
              range={range}
            />
          ))}
        </div>
      )}
    </div>
  );
}
