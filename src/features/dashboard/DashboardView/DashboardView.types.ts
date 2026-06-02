// DashboardView component type definitions
import type { DashboardData, DashboardMetric, MetricKey } from '../dashboard.types';
import type { PillarKey } from '../pillars';

export interface DashboardViewProps {
  className?: string | undefined;
}

export type DashboardFocusState = {
  focusKey: MetricKey;
  focusLabel: string;
} | null;

export interface MetricCardContext {
  data: DashboardData;
  focus: DashboardFocusState;
  setFocus: (key: MetricKey, label: string) => void;
}

export interface SpeakingMetricCardItemProps {
  metric: DashboardMetric;
  context: MetricCardContext;
}

export interface PronunciationMetricCardItemProps {
  metric: DashboardMetric;
  drillCount: number;
  pitchPreview?: number[] | undefined;
}

export interface PillarCardWithStateProps {
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
