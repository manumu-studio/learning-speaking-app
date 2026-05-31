// Contextual tooltip for pillar score cards — shows constituent metric breakdown + weakest-area sentence
'use client';

import { useId } from 'react';

import { METRIC_LABELS, PILLAR_CONFIG } from '@/features/dashboard/pillars';

import type { PillarTooltipProps, TooltipContent, MetricRow } from './PillarTooltip.types';

function computeTooltipContent(
  pillarKey: PillarTooltipProps['pillarKey'],
  metrics: PillarTooltipProps['metrics'],
): TooltipContent {
  const config = PILLAR_CONFIG[pillarKey];
  const metricKeys = config.metricKeys as readonly string[];

  const constituent = metrics.filter((m) => metricKeys.includes(m.key));
  const sorted = [...constituent].sort((a, b) => a.score - b.score);

  if (sorted.length === 0) {
    return { rows: [], contextSentence: 'No data available.' };
  }

  const scores = sorted.map((m) => m.score);
  const avg = scores.reduce((sum, s) => sum + s, 0) / scores.length;
  const lowest = sorted[0];

  const rows: MetricRow[] = sorted.map((m) => ({
    key: m.key,
    label: METRIC_LABELS[m.key] ?? m.key,
    score: m.score,
    isWeakest: lowest !== undefined && m.key === lowest.key,
  }));

  let contextSentence: string;
  if (lowest !== undefined && lowest.score < avg - 1.0) {
    const label = METRIC_LABELS[lowest.key] ?? lowest.key;
    contextSentence = `${label} brought this score down.`;
  } else if (avg >= 8.0) {
    contextSentence = 'Strong performance across all areas.';
  } else {
    contextSentence = 'Consistent across all areas.';
  }

  return { rows, contextSentence };
}

export function PillarTooltip({ pillarKey, metrics, isOpen, onClose }: PillarTooltipProps) {
  const tooltipId = useId();

  if (!isOpen) return null;

  const { rows, contextSentence } = computeTooltipContent(pillarKey, metrics);

  if (rows.length === 0) return null;

  return (
    <>
      {/* Backdrop for mobile tap-outside-to-close */}
      <div
        className="fixed inset-0 z-40 md:hidden"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        id={tooltipId}
        role="tooltip"
        className="absolute left-1/2 top-full z-50 mt-2 w-64 -translate-x-1/2 animate-in fade-in duration-150 rounded-lg border border-slate-700 bg-slate-900 p-3 shadow-lg dark:border-slate-600 dark:bg-slate-700"
      >
        {/* Arrow */}
        <div className="absolute -top-1.5 left-1/2 h-3 w-3 -translate-x-1/2 rotate-45 border-l border-t border-slate-700 bg-slate-900 dark:border-slate-600 dark:bg-slate-700" />

        <ul className="space-y-1.5" aria-label="Metric breakdown">
          {rows.map((row) => (
            <li
              key={row.key}
              className="flex items-center justify-between text-sm"
            >
              <span
                className={
                  row.isWeakest
                    ? 'font-medium text-amber-300'
                    : 'text-slate-300'
                }
              >
                {row.label}
              </span>
              <span
                className={
                  row.isWeakest
                    ? 'font-bold text-amber-300'
                    : 'font-semibold text-slate-100'
                }
              >
                {row.score.toFixed(1)}
              </span>
            </li>
          ))}
        </ul>

        <p className="mt-2 border-t border-slate-700 pt-2 text-xs text-slate-400 dark:border-slate-600">
          {contextSentence}
        </p>
      </div>
    </>
  );
}

PillarTooltip.displayName = 'PillarTooltip';
