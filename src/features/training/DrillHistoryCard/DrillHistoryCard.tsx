// DrillHistoryCard — individual drill entry in history list
'use client';

import type { DrillHistoryCardProps } from './DrillHistoryCard.types';

const DRILL_TYPE_CONFIG: Record<DrillHistoryCardProps['drillType'], { icon: string; label: string }> = {
  rephrase: { icon: '🔄', label: 'Rephrase' },
  constraint: { icon: '🏗', label: 'Constraint' },
  vocabUpgrade: { icon: '📚', label: 'Vocab Upgrade' },
  precision: { icon: '🎯', label: 'Precision' },
  conclusion: { icon: '🎬', label: 'Conclusion' },
};

function formatRelativeDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function DrillHistoryCard({
  id,
  drillType,
  metricLabel,
  improved,
  completedAt,
  createdAt,
  onClick,
  className,
}: DrillHistoryCardProps) {
  const config = DRILL_TYPE_CONFIG[drillType];
  const isCompleted = completedAt !== null;
  const displayDate = completedAt ?? createdAt;

  return (
    <button
      type="button"
      onClick={() => onClick(id)}
      aria-label={`${isCompleted ? 'View' : 'Continue'} ${config.label} drill for ${metricLabel}`}
      className={`w-full rounded-lg border border-zinc-700 bg-zinc-800/50 p-4 text-left transition-colors hover:bg-zinc-700/50 ${className ?? ''}`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-xl">{config.icon}</span>
          <div>
            <p className="text-sm font-medium text-zinc-200">{config.label}</p>
            <p className="text-xs text-zinc-400">{metricLabel}</p>
          </div>
        </div>

        <div className="flex flex-col items-end gap-1">
          {isCompleted ? (
            <span
              className={`text-xs font-medium ${
                improved === true
                  ? 'text-emerald-400'
                  : improved === false
                    ? 'text-amber-400'
                    : 'text-zinc-400'
              }`}
            >
              {improved === true ? '✅ Improved' : improved === false ? '🔄 Practiced' : '—'}
            </span>
          ) : (
            <span className="text-xs text-zinc-500">In progress</span>
          )}
          <span className="text-xs text-zinc-500">{formatRelativeDate(displayDate)}</span>
        </div>
      </div>
    </button>
  );
}
