// DashboardView — renders the full dashboard: pillar-grouped metrics,
// recent sessions, streak, and drill stats.
'use client';

import { IdentitySummary } from '../IdentitySummary';
import { MetricCard } from '../MetricCard';
import { FocusSelector } from '../FocusSelector';
import { DashboardSkeleton } from '../DashboardSkeleton';
import { PillarCard } from '../PillarCard';
import { usePillarCard } from '../PillarCard/usePillarCard';
import { computePillarScores, PILLAR_CONFIG, PILLAR_KEYS } from '../pillars';
import type { PillarKey } from '../pillars';
import { useDashboard } from './useDashboard';
import type {
  DashboardViewProps,
  MetricCardContext,
  PronunciationMetricCardItemProps,
  SpeakingMetricCardItemProps,
} from './DashboardView.types';
import type { DashboardMetric } from '@/features/dashboard/dashboard.types';
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

interface PillarCardWithStateProps {
  pillarKey: PillarKey;
  label: string;
  averageScore: number;
  delta: number;
  sparklineData: number[];
  color: string;
  metricContext: MetricCardContext;
  constituents: DashboardMetric[];
  pronunciationEmpty: boolean;
}

function PillarCardWithState({
  pillarKey,
  label,
  averageScore,
  delta,
  sparklineData,
  color,
  metricContext,
  constituents,
  pronunciationEmpty,
}: PillarCardWithStateProps) {
  const { isExpanded, toggle } = usePillarCard(pillarKey);

  return (
    <PillarCard
      pillarKey={pillarKey}
      label={label}
      averageScore={averageScore}
      delta={delta}
      sparklineData={sparklineData}
      color={color}
      isExpanded={isExpanded}
      onToggle={toggle}
    >
      {pronunciationEmpty ? (
        <p className="col-span-full text-sm text-slate-500 dark:text-slate-400">
          Complete a session with pronunciation assessment enabled to see metrics here.
        </p>
      ) : (
        constituents.map((metric) => {
          const isPronunciationMetric = PRONUNCIATION_METRIC_KEY_SET.has(metric.key);
          return isPronunciationMetric ? (
            <PronunciationMetricCardItem
              key={metric.key}
              metric={metric}
              drillCount={metricContext.data.drillStats.byMetric[metric.key]}
            />
          ) : (
            <SpeakingMetricCardItem
              key={metric.key}
              metric={metric}
              context={metricContext}
            />
          );
        })
      )}
    </PillarCard>
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

  const pillarScores = computePillarScores(data.metrics);

  const pronunciationMetrics = data.metrics.filter((m) =>
    (PILLAR_CONFIG.pronunciation.metricKeys as readonly string[]).includes(m.key),
  );

  const pronunciationEmpty = pronunciationMetrics.every(
    (m) => m.currentScore === 0 && m.history.length === 0,
  );

  const metricContext: MetricCardContext = { data, focus, setFocus };

  return (
    <div className={className}>
      <IdentitySummary
        weeklyMinutes={data.weeklyMinutes}
        weeklySessionCount={data.weeklySessionCount}
        currentFocus={focus?.focusLabel ?? null}
        currentStreak={data.currentStreak}
        totalDrillsCompleted={data.drillStats.totalCompleted}
      />

      {showMetrics ? (
        <section aria-label="Speaking metrics by pillar" className="mt-6 flex flex-col gap-4">
          {PILLAR_KEYS.map((pillarKey) => {
            const config = PILLAR_CONFIG[pillarKey];
            const score = pillarScores.find((s) => s.pillarKey === pillarKey);
            const isPronunciation = pillarKey === 'pronunciation';
            const constituents = data.metrics.filter((m) =>
              (config.metricKeys as readonly string[]).includes(m.key),
            );

            return (
              <PillarCardWithState
                key={pillarKey}
                pillarKey={pillarKey}
                label={config.label}
                averageScore={score?.averageScore ?? 0}
                delta={score?.delta ?? 0}
                sparklineData={score?.sparklineData ?? []}
                color={config.color}
                metricContext={metricContext}
                constituents={constituents}
                pronunciationEmpty={isPronunciation ? pronunciationEmpty : false}
              />
            );
          })}
        </section>
      ) : (
        <div className="mt-6 rounded-xl border border-slate-100 bg-white p-8 text-center dark:border-neutral-800 dark:bg-neutral-900">
          <p className="text-slate-500 dark:text-slate-400">
            Record a few more sessions to see your patterns emerge.
          </p>
        </div>
      )}

      <FocusSelector
        focusLabel={focus?.focusLabel ?? null}
        onClear={clearFocus}
      />
    </div>
  );
}
