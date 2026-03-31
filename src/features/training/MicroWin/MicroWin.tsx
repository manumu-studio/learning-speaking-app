// MicroWin — post-drill motivational message based on improvement status
'use client';

import type { MicroWinProps } from './MicroWin.types';

export function MicroWin({ improved, metricLabel, className }: MicroWinProps) {
  return (
    <div
      className={`rounded-lg px-4 py-3 text-sm ${
        improved
          ? 'border border-emerald-500/20 bg-emerald-500/10 text-emerald-300'
          : 'border border-zinc-600/30 bg-zinc-700/30 text-zinc-300'
      } ${className ?? ''}`}
    >
      {improved ? (
        <p>
          💪 <span className="font-medium">{metricLabel}</span> improved in this drill. Keep it up.
        </p>
      ) : (
        <p>
          🏋️ This takes practice. Try one more rep on <span className="font-medium">{metricLabel}</span>.
        </p>
      )}
    </div>
  );
}
