// IdentitySummary — top-level stats card with weekly minutes, sessions, focus, and streak
import type { IdentitySummaryProps } from './IdentitySummary.types';

export function IdentitySummary({
  weeklyMinutes,
  weeklySessionCount,
  currentFocus,
  currentStreak,
}: IdentitySummaryProps) {
  return (
    <div className="rounded-xl bg-white p-6 shadow-sm border border-slate-100">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatColumn label="This Week" value={`${weeklyMinutes} min`} />
        <StatColumn label="Sessions" value={String(weeklySessionCount)} />
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
