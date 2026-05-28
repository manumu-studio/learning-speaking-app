// PillarDeltaBadge — colored chip showing trend direction and percentage change

import type { PillarDeltaBadgeProps } from './PillarDeltaBadge.types';
import type { TimeRange } from '../trends.types';

/** Map time range to a human-readable period label. */
function getRangeLabel(range: TimeRange): string {
  switch (range) {
    case '7d':
      return 'this week';
    case '30d':
      return 'this month';
    case '90d':
      return 'this quarter';
    case 'all':
      return 'overall';
  }
}

export function PillarDeltaBadge({ delta, range }: PillarDeltaBadgeProps) {
  if (delta === null) return null;

  const rangeLabel = getRangeLabel(range);

  if (delta > 0) {
    return (
      <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
        ↑ {Math.abs(delta).toFixed(1)}% {rangeLabel}
      </span>
    );
  }

  if (delta < 0) {
    return (
      <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
        ↓ {Math.abs(delta).toFixed(1)}% {rangeLabel}
      </span>
    );
  }

  // delta === 0
  return (
    <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400">
      Stable {rangeLabel}
    </span>
  );
}
