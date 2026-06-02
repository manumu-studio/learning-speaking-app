// FluencyComparison — side-by-side results for 4-3-2 fluency rounds with WPM bar chart
'use client';
/* eslint-disable max-lines-per-function */

import Link from 'next/link';
import type { FluencyComparisonProps, FluencyRoundResult } from './FluencyComparison.types';
import { useFluencyComparison } from './useFluencyComparison';

/** Skeleton placeholder for metrics still being processed */
function MetricSkeleton() {
  return (
    <div className="h-5 w-12 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
  );
}

/** Formats a delta value as "+X%" or "-X%" with appropriate color */
function DeltaBadge({ value, invertColor }: { value: number | null; invertColor?: boolean | undefined }) {
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

/** Horizontal SVG bar chart showing WPM across rounds */
function WpmBarChart({ rounds }: { rounds: FluencyRoundResult[] }) {
  const wpmValues = rounds.map((r) => r.speechRateWpm ?? 0);
  const maxWpm = Math.max(...wpmValues, 1);

  const barHeight = 28;
  const gap = 8;
  const labelWidth = 80;
  const chartWidth = 320;
  const totalHeight = rounds.length * (barHeight + gap) - gap;

  return (
    <svg
      viewBox={`0 0 ${labelWidth + chartWidth + 60} ${totalHeight}`}
      className="w-full max-w-md"
      role="img"
      aria-label="Speech rate comparison chart"
    >
      {rounds.map((round, i) => {
        const wpm = round.speechRateWpm;
        const barWidth = wpm !== null ? (wpm / maxWpm) * chartWidth : 0;
        const y = i * (barHeight + gap);

        // Gradient from emerald-500 to emerald-300 across rounds
        const opacity = 1 - i * 0.2;

        return (
          <g key={round.roundNumber}>
            {/* Round label */}
            <text
              x={0}
              y={y + barHeight / 2 + 5}
              className="fill-slate-500 text-xs dark:fill-slate-400"
            >
              Round {round.roundNumber}
            </text>

            {/* Bar */}
            {wpm !== null ? (
              <rect
                x={labelWidth}
                y={y}
                width={barWidth}
                height={barHeight}
                rx={6}
                fill="#10b981"
                opacity={opacity}
              />
            ) : (
              <rect
                x={labelWidth}
                y={y}
                width={chartWidth * 0.3}
                height={barHeight}
                rx={6}
                className="animate-pulse fill-slate-200 dark:fill-slate-700"
              />
            )}

            {/* WPM value label */}
            <text
              x={labelWidth + barWidth + 8}
              y={y + barHeight / 2 + 5}
              className="fill-slate-700 text-sm font-semibold dark:fill-slate-200"
            >
              {wpm !== null ? `${wpm} WPM` : '...'}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

/** Comparison table row for a single metric */
function MetricRow({
  label,
  rounds,
  metricKey,
  deltaValue,
  invertDelta,
}: {
  label: string;
  rounds: FluencyRoundResult[];
  metricKey: 'speechRateWpm' | 'fillerCount' | 'hesitationCount';
  deltaValue: number | null;
  invertDelta?: boolean | undefined;
}) {
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

export function FluencyComparison({
  fluencySessionId,
  promptTitle,
  rounds: initialRounds,
}: FluencyComparisonProps) {
  const { rounds, deltas, isProcessing, motivationalMessage } =
    useFluencyComparison({
      fluencySessionId,
      initialRounds,
    });

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">
          Fluency Breakdown
        </h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          {promptTitle}
        </p>
      </div>

      {/* Processing banner */}
      {isProcessing && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-center text-sm text-blue-700 dark:border-blue-800 dark:bg-blue-950/30 dark:text-blue-300">
          Some metrics are still being processed. Results will update automatically.
        </div>
      )}

      {/* WPM bar chart */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-gray-900">
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          Speech Rate
        </h3>
        <WpmBarChart rounds={rounds} />
      </div>

      {/* Comparison table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-gray-900">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/50">
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Metric
              </th>
              {rounds.map((round) => (
                <th
                  key={round.roundNumber}
                  className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400"
                >
                  R{round.roundNumber} ({round.targetMinutes}m)
                </th>
              ))}
              <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Delta
              </th>
            </tr>
          </thead>
          <tbody>
            <MetricRow
              label="Words/min"
              rounds={rounds}
              metricKey="speechRateWpm"
              deltaValue={deltas.wpmChange}
            />
            <MetricRow
              label="Fillers"
              rounds={rounds}
              metricKey="fillerCount"
              deltaValue={deltas.fillerChange}
              invertDelta
            />
            <MetricRow
              label="Pauses"
              rounds={rounds}
              metricKey="hesitationCount"
              deltaValue={deltas.hesitationChange}
              invertDelta
            />
          </tbody>
        </table>
      </div>

      {/* Motivational message */}
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-4 dark:border-emerald-800 dark:bg-emerald-950/30">
        <p className="text-sm font-medium text-emerald-800 dark:text-emerald-200">
          {motivationalMessage}
        </p>
      </div>

      {/* Action buttons */}
      <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
        <Link
          href="/fluency-training"
          className="rounded-xl bg-slate-900 px-6 py-3 text-center text-sm font-semibold text-white transition-colors hover:bg-slate-700 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
        >
          Try Another Prompt
        </Link>
        <Link
          href={`/fluency-training/${fluencySessionId}`}
          className="rounded-xl border border-slate-300 bg-white px-6 py-3 text-center text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
        >
          View Session Details
        </Link>
      </div>
    </div>
  );
}
