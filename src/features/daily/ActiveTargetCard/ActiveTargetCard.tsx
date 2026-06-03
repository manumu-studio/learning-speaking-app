// "Use this tomorrow" card with progress bar showing mastery progress
import { MasteryBadge } from '@/features/daily/MasteryBadge';
import type { ActiveTargetCardProps } from './ActiveTargetCard.types';

// ─── Progress bar color by mastery state ──────────────────────────────────────

const PROGRESS_COLORS: Record<string, string> = {
  emerging: 'bg-gray-400 dark:bg-gray-500',
  developing: 'bg-blue-500 dark:bg-blue-400',
  consolidating: 'bg-amber-500 dark:bg-amber-400',
  mastered: 'bg-emerald-500 dark:bg-emerald-400',
};

const MASTERY_GOAL = 15;

// ─── Component ────────────────────────────────────────────────────────────────

export function ActiveTargetCard({
  text,
  category,
  usageCount,
  masteryState,
}: ActiveTargetCardProps) {
  const progressPct = Math.min((usageCount / MASTERY_GOAL) * 100, 100);
  const barColor = PROGRESS_COLORS[masteryState] ?? PROGRESS_COLORS.emerging;

  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-800 p-3 bg-white dark:bg-black">
      <div className="text-xs text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-1">
        {category.replace(/_/g, ' ')}
      </div>
      <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">{text}</p>

      {/* Progress bar */}
      <div className="h-1.5 w-full rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden mb-2">
        <div
          className={`h-full rounded-full transition-all ${barColor}`}
          style={{ width: `${progressPct}%` }}
        />
      </div>

      <MasteryBadge state={masteryState} usageCount={usageCount} />
    </div>
  );
}
