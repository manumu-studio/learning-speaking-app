// MetricCard component type definitions
import type { MetricKey, MetricLevel, TrendDirection } from '../dashboard.types';

/** Props for the selectable metric tile (sparkline, trend badge, optional drill count). */
export interface MetricCardProps {
  metricKey: MetricKey;
  label: string;
  currentLevel: MetricLevel;
  currentScore: number;
  trend: TrendDirection;
  history: number[];
  isSelected: boolean;
  onSelect: (key: MetricKey) => void;
  lastTrainedToday?: boolean | undefined;
  /** Completed drills targeting this metric */
  drillCount?: number | undefined;
}
