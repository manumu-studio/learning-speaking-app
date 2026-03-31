// DashboardView — client component wiring all dashboard sections together
'use client';

import { IdentitySummary } from '../IdentitySummary';
import { MetricCard } from '../MetricCard';
import { FocusSelector } from '../FocusSelector';
import { DashboardSkeleton } from '../DashboardSkeleton';
import { useDashboard } from './useDashboard';
import type { DashboardViewProps } from './DashboardView.types';

const MIN_SESSIONS_FOR_METRICS = 3;

export function DashboardView({ className }: DashboardViewProps) {
  const { data, isLoading, error, focus, setFocus, clearFocus } = useDashboard();

  if (isLoading) {
    return <DashboardSkeleton className={className} />;
  }

  if (error) {
    return (
      <div className={`rounded-xl bg-white p-8 text-center ${className ?? ''}`}>
        <p className="text-slate-500">Unable to load dashboard. Please try again later.</p>
      </div>
    );
  }

  if (!data) return null;

  const showMetrics = data.totalSessions >= MIN_SESSIONS_FOR_METRICS;

  return (
    <div className={className}>
      {/* Identity summary — top stats row */}
      <IdentitySummary
        weeklyMinutes={data.weeklyMinutes}
        weeklySessionCount={data.weeklySessionCount}
        currentFocus={focus?.focusLabel ?? null}
        currentStreak={data.currentStreak}
      />

      {/* Metric cards grid */}
      {showMetrics ? (
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.metrics.map((metric) => (
            <MetricCard
              key={metric.key}
              metricKey={metric.key}
              label={metric.label}
              currentLevel={metric.currentLevel}
              currentScore={metric.currentScore}
              trend={metric.trend}
              history={metric.history}
              isSelected={focus?.focusKey === metric.key}
              onSelect={(key) => {
                const selected = data.metrics.find((m) => m.key === key);
                if (selected) {
                  setFocus(key, selected.label);
                }
              }}
              lastTrainedToday={metric.key === data.lastTrainedMetricKey}
            />
          ))}
        </div>
      ) : (
        <div className="mt-6 rounded-xl bg-white p-8 text-center border border-slate-100">
          <p className="text-slate-500">
            Record a few more sessions to see your patterns emerge.
          </p>
        </div>
      )}

      {/* Focus selector — sticky bottom banner */}
      <FocusSelector
        focusLabel={focus?.focusLabel ?? null}
        onClear={clearFocus}
      />
    </div>
  );
}
