// Comparison table showing per-round metrics and deltas for fluency sessions
'use client';

import type { FluencyRoundResult, FluencyDeltas } from './FluencyComparison.types';
import { MetricRow } from './MetricRow';

export interface ComparisonTableProps {
  rounds: FluencyRoundResult[];
  deltas: FluencyDeltas;
}

/** Full metric comparison table with header row and per-metric rows */
export function ComparisonTable({ rounds, deltas }: ComparisonTableProps) {
  return (
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
  );
}
