// Per-pillar score summary row with hover tooltips
'use client';

import { PILLAR_CONFIG, PILLAR_KEYS } from '@/features/dashboard/pillars';
import type { PillarKey } from '@/features/dashboard/pillars';
import { ScoreChip } from '@/components/ui/ScoreChip';
import { PillarTooltip, usePillarTooltip } from '@/components/ui/PillarTooltip';
import type { SessionMetricSnapshot } from '@/features/session/useSessionStatus.types';

function computeSessionPillarAverages(
  metrics: SessionMetricSnapshot[],
): Record<PillarKey, number> {
  const result: Record<PillarKey, number> = { delivery: 0, language: 0, pronunciation: 0 };

  for (const pillarKey of PILLAR_KEYS) {
    const config = PILLAR_CONFIG[pillarKey];
    const constituent = metrics.filter((m) =>
      (config.metricKeys as readonly string[]).includes(m.key),
    );
    if (constituent.length === 0) {
      result[pillarKey] = 0;
    } else {
      const sum = constituent.reduce((acc, m) => acc + m.score, 0);
      result[pillarKey] = sum / constituent.length;
    }
  }

  return result;
}

interface PillarHeroRowProps {
  metrics: SessionMetricSnapshot[];
}

export function PillarHeroRow({ metrics }: PillarHeroRowProps) {
  const averages = computeSessionPillarAverages(metrics);
  const { getTriggerProps, getTooltipProps } = usePillarTooltip();

  return (
    <div
      className="mt-4 grid grid-cols-3 gap-3"
      aria-label="Pillar performance summary"
    >
      {PILLAR_KEYS.map((pillarKey) => {
        const config = PILLAR_CONFIG[pillarKey];
        const score = averages[pillarKey];
        const trigger = getTriggerProps(pillarKey);
        const tooltip = getTooltipProps(pillarKey);
        return (
          <div key={pillarKey} className="relative">
            <div
              className="flex cursor-pointer flex-col items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 p-3 text-center transition-colors hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800/60 dark:hover:border-slate-600"
              {...trigger}
            >
              <span className="text-xs font-medium text-slate-500 dark:text-sky-300/70">
                {config.label}
              </span>
              <span className="text-xl font-bold text-slate-800 dark:text-slate-100">
                {score > 0 ? score.toFixed(1) : '—'}
              </span>
              {score > 0 && <ScoreChip score={score} scale="ten" />}
            </div>
            <PillarTooltip
              pillarKey={pillarKey}
              metrics={metrics}
              {...tooltip}
            />
          </div>
        );
      })}
    </div>
  );
}
