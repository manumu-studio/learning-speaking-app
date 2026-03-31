// DrillStats — summary stats bar for drill activity
'use client';

import type { DrillStatsProps } from './DrillStats.types';

interface StatItemProps {
  label: string;
  value: string;
}

function StatItem({ label, value }: StatItemProps) {
  return (
    <div className="flex flex-col items-center gap-1 px-4 py-3">
      <span className="text-2xl font-bold text-zinc-100">{value}</span>
      <span className="text-xs text-zinc-400">{label}</span>
    </div>
  );
}

export function DrillStats({
  totalCompleted,
  weeklyCompleted,
  improvementRate,
  className,
}: DrillStatsProps) {
  return (
    <div
      className={`grid grid-cols-3 divide-x divide-zinc-700 rounded-xl border border-zinc-700 bg-zinc-800/50 ${className ?? ''}`}
    >
      <StatItem label="Total Drills" value={String(totalCompleted)} />
      <StatItem label="This Week" value={String(weeklyCompleted)} />
      <StatItem label="Improvement" value={`${Math.round(improvementRate)}%`} />
    </div>
  );
}
