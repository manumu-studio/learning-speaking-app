// Types for the PrioritySounds component — high-functional-load pronunciation priorities

import type { RankedFLError } from '@/lib/pronunciation/functionalLoad.types';

export interface PrioritySoundsProps {
  /** Ranked high/moderate-FL errors (already filtered to the priority tier). */
  errors: RankedFLError[];
  /** Max cards to show. Default 3. */
  maxItems?: number;
  animationDelay?: number;
}
