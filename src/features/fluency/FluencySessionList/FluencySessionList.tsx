// List of past fluency training sessions with WPM progression
import Link from 'next/link';
import type { FluencySessionListProps } from './FluencySessionList.types';

const STATUS_BADGES = {
  COMPLETED: { label: '✅ Completed', className: 'text-emerald-600 dark:text-emerald-400' },
  IN_PROGRESS: { label: '⏳ In Progress', className: 'text-amber-600 dark:text-amber-400' },
  ABANDONED: { label: '— Abandoned', className: 'text-gray-500 dark:text-gray-400' },
} as const;

function computeImprovement(r1Wpm: number | null, r3Wpm: number | null): string | null {
  if (r1Wpm === null || r3Wpm === null || r1Wpm === 0) return null;
  const pct = Math.round(((r3Wpm - r1Wpm) / r1Wpm) * 100);
  return pct > 0 ? `+${pct}%` : `${pct}%`;
}

export function FluencySessionList({ sessions }: FluencySessionListProps) {
  return (
    <div className="flex flex-col gap-3">
      {sessions.map((s) => {
        const badge = STATUS_BADGES[s.status];
        const r1 = s.rounds.find((r) => r.roundNumber === 1);
        const r3 = s.rounds.find((r) => r.roundNumber === 3);
        const improvement = computeImprovement(r1?.speechRateWpm ?? null, r3?.speechRateWpm ?? null);
        const dateStr = new Date(s.createdAt).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
        });

        return (
          <Link
            key={s.id}
            href={`/fluency-training/${s.id}`}
            className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900 hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-bold text-gray-900 dark:text-white truncate">
                {s.promptTitle}
              </h3>
              <div className="flex items-center gap-2 shrink-0">
                <span className={`text-xs font-medium ${badge.className}`}>{badge.label}</span>
                <span className="text-xs text-gray-400 dark:text-gray-500">{dateStr}</span>
              </div>
            </div>
            <div className="mt-2 flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400">
              {s.rounds.map((r) => (
                <span key={r.roundNumber}>
                  R{r.roundNumber}:{' '}
                  {r.speechRateWpm !== null ? `${Math.round(r.speechRateWpm)} WPM` : '—'}
                </span>
              ))}
              {s.rounds.length < 3 &&
                Array.from({ length: 3 - s.rounds.length }, (_, i) => (
                  <span key={`empty-${i}`}>R{s.rounds.length + i + 1}: —</span>
                ))}
              {improvement && (
                <span className="ml-2 font-semibold text-emerald-600 dark:text-emerald-400">
                  ({improvement})
                </span>
              )}
            </div>
          </Link>
        );
      })}
    </div>
  );
}
