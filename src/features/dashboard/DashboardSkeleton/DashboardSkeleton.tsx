// DashboardSkeleton — loading placeholder matching dashboard layout
import type { DashboardSkeletonProps } from './DashboardSkeleton.types';

export function DashboardSkeleton({ className }: DashboardSkeletonProps) {
  return (
    <div className={className}>
      {/* IdentitySummary skeleton — 4 stat columns */}
      <div className="rounded-xl bg-white p-6 shadow-sm border border-slate-100 dark:border-slate-700 dark:bg-slate-800">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex flex-col items-center gap-2">
              <div className="h-4 w-16 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
              <div className="h-6 w-12 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
            </div>
          ))}
        </div>
      </div>

      {/* MetricCard grid skeleton — 2x3 on desktop, 1 col on mobile */}
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl border border-slate-100 bg-white p-4 dark:border-slate-700 dark:bg-slate-800"
          >
            <div className="flex items-start justify-between">
              <div>
                <div className="h-4 w-24 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
                <div className="mt-2 h-5 w-20 animate-pulse rounded-full bg-slate-200 dark:bg-slate-700" />
              </div>
              <div className="h-6 w-8 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
            </div>
            <div className="mt-3 h-7 w-full animate-pulse rounded bg-slate-100 dark:bg-slate-700/50" />
          </div>
        ))}
      </div>
    </div>
  );
}
