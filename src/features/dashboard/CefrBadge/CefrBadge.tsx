// CEFR level badge — shows current level, weighted average, sparkline trend, and next milestone
'use client';

import { useEffect, useState } from 'react';
import { z } from 'zod';
import type { CefrBadgeProps, CefrLevel } from './CefrBadge.types';

const LEVEL_CONFIG: Record<CefrLevel, { label: string; color: string; next: CefrLevel | null; threshold: number }> = {
  'below-c1': { label: 'Below C1', color: 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300', next: 'c1-low', threshold: 4.0 },
  'c1-low': { label: 'C1 Low', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300', next: 'c1-mid', threshold: 5.5 },
  'c1-mid': { label: 'C1 Mid', color: 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300', next: 'c1-high', threshold: 7.0 },
  'c1-high': { label: 'C1 High', color: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300', next: 'c2', threshold: 8.5 },
  'c2': { label: 'C2', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300', next: null, threshold: 10 },
};

const CefrHistorySchema = z.object({
  history: z.array(z.object({
    sessionId: z.string(),
    date: z.string(),
    level: z.string(),
    weightedAverage: z.number(),
  })),
});

function Sparkline({ values }: { values: number[] }) {
  if (values.length < 2) return null;

  const width = 120;
  const height = 24;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const points = values.map((v, i) => {
    const x = (i / (values.length - 1)) * width;
    const y = height - ((v - min) / range) * (height - 4) - 2;
    return `${x},${y}`;
  });

  return (
    <svg width={width} height={height} className="inline-block" aria-hidden="true">
      <polyline
        points={points.join(' ')}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        className="text-sky-500 dark:text-sky-400"
      />
    </svg>
  );
}

export function CefrBadge({ estimate }: CefrBadgeProps) {
  const [historyValues, setHistoryValues] = useState<number[]>([]);

  useEffect(() => {
    void fetch('/api/users/me/cefr-history')
      .then(async (res) => {
        if (!res.ok) return;
        const json: unknown = await res.json();
        const parsed = CefrHistorySchema.safeParse(json);
        if (parsed.success) {
          setHistoryValues(parsed.data.history.slice(-8).map((h) => h.weightedAverage));
        }
      })
      .catch(() => undefined);
  }, []);

  if (!estimate) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Complete a workout to see your level
        </p>
      </div>
    );
  }

  const config = LEVEL_CONFIG[estimate.level];
  const nextConfig = config.next ? LEVEL_CONFIG[config.next] : null;
  const gap = nextConfig ? (nextConfig.threshold - estimate.weightedAverage).toFixed(1) : null;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
      <div className="flex items-center gap-3">
        <span className={`rounded-full px-3 py-1.5 text-sm font-bold ${config.color}`}>
          {config.label}
        </span>
        <span className="text-lg font-bold text-slate-800 dark:text-slate-100">
          {estimate.weightedAverage.toFixed(1)} / 10
        </span>
      </div>

      {historyValues.length >= 2 && (
        <div className="mt-2">
          <Sparkline values={historyValues} />
        </div>
      )}

      {nextConfig && gap && (
        <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
          You&apos;re building toward {nextConfig.label} (need {nextConfig.threshold} avg, {gap} to go)
        </p>
      )}
    </div>
  );
}
