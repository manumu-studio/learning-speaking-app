// Shared type definitions for the trends feature

import type { TrendDataItem } from '@/components/ui/TrendChart';

// Re-export API schemas and types for client-side consumption
export type {
  TrendsResponse,
  TrendDataPoint,
  PillarTrend,
} from '@/lib/schemas/trends';

export { TrendsResponseSchema } from '@/lib/schemas/trends';

export type { TrendDataItem } from '@/components/ui/TrendChart';

/** Available time ranges for trend data queries. */
export type TimeRange = '7d' | '30d' | '90d' | 'all';

/** Label-value pair for rendering time range picker buttons. */
export interface TimeRangeOption {
  readonly value: TimeRange;
  readonly label: string;
}

export const TIME_RANGE_OPTIONS: readonly TimeRangeOption[] = [
  { value: '7d', label: '7 days' },
  { value: '30d', label: '30 days' },
  { value: '90d', label: '90 days' },
  { value: 'all', label: 'All time' },
] as const;

/** Per-metric time series within a pillar. */
export interface MetricTrendSeries {
  readonly metricKey: string;
  readonly label: string;
  readonly series: TrendDataItem[];
}

/** Pillar-level trend data with aggregated series and per-metric breakdowns. */
export interface PillarTrendSeries {
  readonly pillarKey: string;
  readonly label: string;
  readonly color: string;
  readonly series: TrendDataItem[];
  readonly deltaPercent: number | null;
  readonly metricSeries: MetricTrendSeries[];
}

/** Discriminated union for trends fetch state. */
export type TrendsState =
  | { readonly status: 'idle' }
  | { readonly status: 'loading' }
  | { readonly status: 'success'; readonly pillarSeries: PillarTrendSeries[] }
  | { readonly status: 'error'; readonly message: string };
