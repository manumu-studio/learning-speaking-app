// Displays mastery state with progress indicator
import type { MasteryBadgeProps } from './MasteryBadge.types';

// ─── State → color mapping ────────────────────────────────────────────────────

const STATE_COLORS: Record<string, string> = {
  emerging: 'text-gray-500 dark:text-gray-400',
  developing: 'text-blue-600 dark:text-blue-400',
  consolidating: 'text-amber-600 dark:text-amber-400',
  mastered: 'text-emerald-600 dark:text-emerald-400',
};

const MASTERY_GOAL = 15;

// ─── Component ────────────────────────────────────────────────────────────────

export function MasteryBadge({ state, usageCount }: MasteryBadgeProps) {
  const colorClass = STATE_COLORS[state] ?? STATE_COLORS.emerging;
  const label = state === 'mastered' ? `${state} ✓` : state;

  return (
    <span className={`text-xs font-medium ${colorClass}`}>
      {label} ({usageCount}/{MASTERY_GOAL})
    </span>
  );
}
