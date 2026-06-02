// DashboardView sub-components: metric card items and pillar card with local expansion state
'use client';

import { MetricCard } from '../MetricCard';
import { PillarCard } from '../PillarCard';
import { usePillarCard } from '../PillarCard/usePillarCard';
import { PRONUNCIATION_METRIC_KEYS } from '@/features/dashboard/dashboard.types';
import type {
  SpeakingMetricCardItemProps,
  PronunciationMetricCardItemProps,
  PillarCardWithStateProps,
} from './DashboardView.types';

const PRONUNCIATION_METRIC_KEY_SET = new Set<string>(PRONUNCIATION_METRIC_KEYS);

export function SpeakingMetricCardItem({ metric, context }: SpeakingMetricCardItemProps) {
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
        if (selected) setFocus(key, selected.label);
      }}
      lastTrainedToday={metric.lastTrainedToday}
      drillCount={data.drillStats.byMetric[metric.key]}
    />
  );
}

export function PronunciationMetricCardItem({
  metric,
  drillCount,
  pitchPreview,
}: PronunciationMetricCardItemProps) {
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
      pitchPreview={metric.key === 'prosodyScore' ? pitchPreview : undefined}
    />
  );
}

function PillarMetricItems({
  constituents,
  metricContext,
  pronunciationEmpty,
}: Pick<PillarCardWithStateProps, 'constituents' | 'metricContext' | 'pronunciationEmpty'>) {
  if (pronunciationEmpty) {
    return (
      <p className="col-span-full text-sm text-slate-500 dark:text-slate-400">
        Complete a session with pronunciation assessment enabled to see metrics here.
      </p>
    );
  }

  return (
    <>
      {constituents.map((metric) => {
        const isPronunciationMetric = PRONUNCIATION_METRIC_KEY_SET.has(metric.key);
        if (isPronunciationMetric) {
          return (
            <PronunciationMetricCardItem
              key={metric.key}
              metric={metric}
              drillCount={metricContext.data.drillStats.byMetric[metric.key]}
              pitchPreview={
                metric.key === 'prosodyScore'
                  ? metricContext.data.recentProsodyPitchPreview
                  : undefined
              }
            />
          );
        }
        return (
          <SpeakingMetricCardItem key={metric.key} metric={metric} context={metricContext} />
        );
      })}
    </>
  );
}

export function PillarCardWithState({
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
      <PillarMetricItems
        constituents={constituents}
        metricContext={metricContext}
        pronunciationEmpty={pronunciationEmpty}
      />
    </PillarCard>
  );
}
