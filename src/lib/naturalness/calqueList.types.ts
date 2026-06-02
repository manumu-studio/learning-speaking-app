// Types for the deterministic calque checklist
import type { NaturalnessFlagType, NaturalnessDimension } from './naturalness.types';

export interface CalqueEntry {
  /** Trigger pattern to search for in the transcript (lowercase). */
  trigger: string;
  /** Optional regex for context-aware matching (overrides simple substring). */
  pattern: RegExp | null;
  /** The L1 Spanish source that causes this calque. */
  l1Source: string;
  /** The natural English equivalent. */
  correction: string;
  flagType: NaturalnessFlagType;
  dimension: NaturalnessDimension;
  /** Human-readable explanation of why this is a calque. */
  rationale: string;
}
