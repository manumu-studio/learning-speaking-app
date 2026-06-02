// Types for the AccentPolish component — low-functional-load refinements (optional)

import type { RankedFLError } from '@/lib/pronunciation/functionalLoad.types';

export interface AccentPolishProps {
  /** Ranked low-FL errors (the "accent polish" tier). */
  errors: RankedFLError[];
  animationDelay?: number;
}
