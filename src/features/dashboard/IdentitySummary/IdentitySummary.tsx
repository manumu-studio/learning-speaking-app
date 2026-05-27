// IdentitySummary — top-level stats card with weekly minutes, sessions, focus, and streak
import type { IdentitySummaryProps } from './IdentitySummary.types';

export function IdentitySummary({
  weeklyMinutes,
  weeklySessionCount,
  currentFocus,
  currentStreak,
  totalDrillsCompleted = 0,
  workoutWeeks,
}: IdentitySummaryProps) {
  void currentStreak;
  return (
    <div className="rounded-xl bg-white p-6 shadow-sm border border-slate-100 dark:bg-gray-900 dark:border-slate-800">
      <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatColumn label="This Week" value={`${weeklyMinutes} min`} />
        <div className="text-center">
          <dt className="text-sm font-medium text-slate-500 dark:text-slate-400">Workouts</dt>
          <dd className="mt-1 text-xl font-semibold text-slate-800 dark:text-slate-200">{weeklySessionCount}</dd>
          {totalDrillsCompleted > 0 ? (
            <dd className="mt-1 text-xs text-slate-400 dark:text-slate-500">
              · {totalDrillsCompleted} drill{totalDrillsCompleted !== 1 ? 's' : ''} completed
            </dd>
          ) : null}
        </div>
        <StatColumn
          label="Focus"
          value={currentFocus ?? 'Not set'}
          muted={currentFocus === null}
        />
        {workoutWeeks !== undefined && workoutWeeks > 0 && (
          <StatColumn label="Workout Weeks" value={String(workoutWeeks)} />
        )}
      </dl>
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
      <dt className="text-sm font-medium text-slate-500 dark:text-slate-400">{label}</dt>
      <dd
        className={`mt-1 text-xl font-semibold ${
          muted ? 'text-slate-400 dark:text-slate-500' : 'text-slate-800 dark:text-slate-200'
        }`}
      >
        {value}
      </dd>
    </div>
  );
}
