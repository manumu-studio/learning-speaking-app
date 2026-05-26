// DashboardView — renders the full dashboard: speaking pattern metrics,
// pronunciation metrics, recent sessions, streak, and drill stats.
'use client';

import { IdentitySummary } from '../IdentitySummary';
import { MetricCard } from '../MetricCard';
import { FocusSelector } from '../FocusSelector';
import { DashboardSkeleton } from '../DashboardSkeleton';
import { useDashboard } from './useDashboard';
import type {
  DashboardViewProps,
  MetricCardContext,
  PronunciationMetricCardItemProps,
  SpeakingMetricCardItemProps,
} from './DashboardView.types';
import { PRONUNCIATION_METRIC_KEYS } from '@/features/dashboard/dashboard.types';

const MIN_SESSIONS_FOR_METRICS = 3;

const PRONUNCIATION_METRIC_KEY_SET = new Set<string>(PRONUNCIATION_METRIC_KEYS);

function SpeakingMetricCardItem({ metric, context }: SpeakingMetricCardItemProps) {
  const { data, focus, setFocus } = context;

  return (
    <MetricCard
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
      lastTrainedToday={metric.lastTrainedToday}
      drillCount={data.drillStats.byMetric[metric.key]}
    />
  );
}

function PronunciationMetricCardItem({ metric, drillCount }: PronunciationMetricCardItemProps) {
  return (
    <MetricCard
      metricKey={metric.key}
      label={metric.label}
      currentLevel={metric.currentLevel}
      currentScore={metric.currentScore}
      trend={metric.trend}
      history={metric.history}
      isSelected={false}
      lastTrainedToday={metric.lastTrainedToday}
      drillCount={drillCount}
    />
  );
}

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

  const pronunciationMetrics = data.metrics.filter((m) =>
    PRONUNCIATION_METRIC_KEY_SET.has(m.key),
  );

  const speakingMetrics = data.metrics.filter(
    (m) => !PRONUNCIATION_METRIC_KEY_SET.has(m.key),
  );

  const pronunciationEmpty = pronunciationMetrics.every(
    (m) => m.currentScore === 0 && m.history.length === 0,
  );

  const metricContext: MetricCardContext = { data, focus, setFocus };

  return (
    <div className={className}>
      {/* Identity summary — top stats row */}
      <IdentitySummary
        weeklyMinutes={data.weeklyMinutes}
        weeklySessionCount={data.weeklySessionCount}
        currentFocus={focus?.focusLabel ?? null}
        currentStreak={data.currentStreak}
        totalDrillsCompleted={data.drillStats.totalCompleted}
      />

      {showMetrics ? (
        <>
          {/* Speaking pattern metrics */}
          <section aria-labelledby="speaking-section-heading" className="mt-6">
            <h2
              id="speaking-section-heading"
              className="mb-4 text-lg font-semibold text-slate-800 dark:text-slate-200"
            >
              Speaking Patterns
            </h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {speakingMetrics.map((metric) => (
                <SpeakingMetricCardItem
                  key={metric.key}
                  metric={metric}
                  context={metricContext}
                />
              ))}
            </div>
          </section>

          {/* Pronunciation & intonation metrics */}
          <section aria-labelledby="pronunciation-section-heading" className="mt-8">
            <h2
              id="pronunciation-section-heading"
              className="mb-4 text-lg font-semibold text-slate-800 dark:text-slate-200"
            >
              Pronunciation & Intonation
            </h2>

            {pronunciationEmpty ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Complete a session with pronunciation assessment enabled to see metrics here.
              </p>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {pronunciationMetrics.map((metric) => (
                  <PronunciationMetricCardItem
                    key={metric.key}
                    metric={metric}
                    drillCount={data.drillStats.byMetric[metric.key]}
                  />
                ))}
              </div>
            )}
          </section>
        </>
      ) : (
        <div className="mt-6 rounded-xl border border-slate-100 bg-white p-8 text-center">
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
