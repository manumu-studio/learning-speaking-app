// PillarTrendCard component type definitions

import type { PillarTrendSeries } from '../trends.types';
import type { TimeRange } from '../trends.types';

export interface PillarTrendCardProps {
  /** Full pillar trend data including metric breakdowns. */
  readonly pillar: PillarTrendSeries;
  /** Current time range — forwarded to PillarDeltaBadge. */
  readonly range: TimeRange;
}
