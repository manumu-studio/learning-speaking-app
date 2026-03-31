// IdentitySummary — top-level stats card with weekly minutes, sessions, focus, and streak
import type { IdentitySummaryProps } from './IdentitySummary.types';

export function IdentitySummary({
  weeklyMinutes,
  weeklySessionCount,
  currentFocus,
  currentStreak,
  totalDrillsCompleted = 0,
}: IdentitySummaryProps) {
  return (
    <div className="rounded-xl bg-white p-6 shadow-sm border border-slate-100">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatColumn label="This Week" value={`${weeklyMinutes} min`} />
        <div className="text-center">
          <p className="text-sm font-medium text-slate-500">Sessions</p>
          <p className="mt-1 text-xl font-semibold text-slate-800">{weeklySessionCount}</p>
          {totalDrillsCompleted > 0 ? (
            <p className="mt-1 text-xs text-slate-400">
              · {totalDrillsCompleted} drill{totalDrillsCompleted !== 1 ? 's' : ''} completed
            </p>
          ) : null}
        </div>
        <StatColumn
          label="Focus"
          value={currentFocus ?? 'Not set'}
          muted={currentFocus === null}
        />
        {currentStreak >= 2 && (
          <StatColumn label="Streak" value={`${currentStreak} days`} />
        )}
      </div>
    </div>
  );
}

function StatColumn({
  label,
  value,
  muted = false,
}: {
  label: string;
  value: string;
  muted?: boolean;
}) {
  return (
    <div className="text-center">
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p
        className={`mt-1 text-xl font-semibold ${
          muted ? 'text-slate-400' : 'text-slate-800'
        }`}
      >
        {value}
      </p>
    </div>
  );
}
