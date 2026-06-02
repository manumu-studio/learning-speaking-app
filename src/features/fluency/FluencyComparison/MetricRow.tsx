// Comparison table helpers: MetricSkeleton, DeltaBadge, and MetricRow for fluency results
'use client';

import type { FluencyRoundResult } from './FluencyComparison.types';

/** Skeleton placeholder for metrics still being processed */
export function MetricSkeleton() {
  return (
    <div className="h-5 w-12 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
  );
}

export interface DeltaBadgeProps {
  value: number | null;
  invertColor?: boolean | undefined;
}

/** Formats a delta value as "+X%" or "-X%" with appropriate color */
export function DeltaBadge({ value, invertColor }: DeltaBadgeProps) {
  if (value === null) return <span className="text-xs text-slate-400">—</span>;

  // For fillers/hesitations, negative is good. For WPM, positive is good.
  const isPositive = invertColor ? value < 0 : value > 0;
  const colorClass = isPositive
    ? 'text-emerald-600 dark:text-emerald-400'
    : value === 0
      ? 'text-slate-500 dark:text-slate-400'
      : 'text-amber-600 dark:text-amber-400';

  const prefix = value > 0 ? '+' : '';

  return (
    <span className={`text-sm font-semibold ${colorClass}`}>
      {prefix}{value}%
    </span>
  );
}

export interface MetricRowProps {
  label: string;
  rounds: FluencyRoundResult[];
  metricKey: 'speechRateWpm' | 'fillerCount' | 'hesitationCount';
  deltaValue: number | null;
  invertDelta?: boolean | undefined;
}

/** Comparison table row for a single fluency metric */
export function MetricRow({
  label,
  rounds,
  metricKey,
  deltaValue,
  invertDelta,
}: MetricRowProps) {
  return (
    <tr className="border-b border-slate-100 dark:border-slate-800">
      <td className="px-4 py-3 text-sm font-medium text-slate-700 dark:text-slate-300">
        {label}
      </td>
      {rounds.map((round) => (
        <td
          key={round.roundNumber}
          className="px-4 py-3 text-center text-sm tabular-nums text-slate-900 dark:text-slate-100"
        >
          {round[metricKey] !== null ? round[metricKey] : <MetricSkeleton />}
        </td>
      ))}
      <td className="px-4 py-3 text-center">
        <DeltaBadge value={deltaValue} invertColor={invertDelta} />
      </td>
    </tr>
  );
}
