// DrillHistoryView — drill history page with stats bar and drill list
'use client';

import { useRouter } from 'next/navigation';
import { DrillStats } from '@/features/training/DrillStats';
import { DrillHistoryCard } from '@/features/training/DrillHistoryCard';
import type { DrillHistoryViewProps } from './DrillHistoryView.types';
import { useDrillHistory } from './useDrillHistory';

export function DrillHistoryView({ className }: DrillHistoryViewProps) {
  const router = useRouter();
  const { drills, stats, isLoading, error } = useDrillHistory();

  const handleDrillClick = (id: string) => {
    router.push(`/drill/${id}`);
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <p className="text-zinc-400">Loading training history...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <p className="text-amber-400">{error}</p>
      </div>
    );
  }

  return (
    <div className={`mx-auto max-w-2xl space-y-6 p-4 ${className ?? ''}`}>
      <h1 className="text-2xl font-bold text-zinc-100">Training</h1>

      <DrillStats
        totalCompleted={stats.totalCompleted}
        weeklyCompleted={stats.weeklyCompleted}
        improvementRate={stats.improvementRate}
      />

      {drills.length === 0 ? (
        <div className="rounded-xl border border-zinc-700 bg-zinc-800/30 p-8 text-center">
          <p className="text-zinc-400">
            No drills yet. Complete a session and try your first training exercise.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {drills.map((drill) => (
            <DrillHistoryCard
              key={drill.id}
              id={drill.id}
              drillType={drill.drillType}
              metricKey={drill.metricKey}
              metricLabel={drill.metricLabel}
              improved={drill.improved}
              completedAt={drill.completedAt}
              createdAt={drill.createdAt}
              onClick={handleDrillClick}
            />
          ))}
        </div>
      )}
    </div>
  );
}
