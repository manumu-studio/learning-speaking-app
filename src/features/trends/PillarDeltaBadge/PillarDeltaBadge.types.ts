// PillarDeltaBadge component type definitions

import type { TimeRange } from '../trends.types';

export interface PillarDeltaBadgeProps {
  /** Percentage change; null hides the badge entirely. */
  readonly delta: number | null;
  /** Current time range — determines the label suffix (e.g. "this week"). */
  readonly range: TimeRange;
}
