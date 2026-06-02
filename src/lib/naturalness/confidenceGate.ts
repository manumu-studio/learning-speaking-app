// Assigns confidence tiers and merges detection sources into unified naturalness flags
import type { NaturalnessFlagInput, NaturalnessFlagType, NaturalnessDimension } from './naturalness.types';

/** Shape of Claude-detected naturalness issues from the analysis response. */
export interface ClaudeNaturalnessItem {
  original: string;
  suggested: string;
  rationale: string;
  dimension: string;
}

/**
 * Maps a Claude-reported dimension string to our typed dimension union, falling back to 'collocation'.
 */
const VALID_DIMENSIONS: Record<string, NaturalnessDimension> = {
  collocation: 'collocation',
  discourse_marker: 'discourse_marker',
  hedging: 'hedging',
  register: 'register',
  rhythm: 'rhythm',
  given_new: 'given_new',
  false_friend: 'false_friend',
  syntax: 'syntax',
};

function parseDimension(raw: string): NaturalnessDimension {
  const normalized = raw.toLowerCase().replace(/\s+/g, '_');
  return VALID_DIMENSIONS[normalized] ?? 'collocation';
}

/**
 * Determines flag type for Claude-detected items based on dimension.
 */
function inferFlagType(dimension: NaturalnessDimension): NaturalnessFlagType {
  if (dimension === 'collocation') return 'weak_collocation';
  return 'style_note';
}

/**
 * Checks whether a Claude-flagged item duplicates an existing deterministic calque flag.
 * Comparison is fuzzy: if the suggested phrases share 3+ words, treat as duplicate.
 */
function isDuplicate(claudeItem: ClaudeNaturalnessItem, calqueFlags: NaturalnessFlagInput[]): boolean {
  const claudeWords = new Set(claudeItem.suggested.toLowerCase().split(/\s+/));
  return calqueFlags.some((flag) => {
    const flagWords = flag.suggestedPhrase.toLowerCase().split(/\s+/);
    const overlap = flagWords.filter((w) => claudeWords.has(w)).length;
    return overlap >= 3 || flag.originalPhrase.toLowerCase().includes(claudeItem.original.toLowerCase());
  });
}

/**
 * Merges deterministic calque flags (Tier 1, high confidence) with Claude-detected
 * naturalness issues (Tier 3, low confidence). Deduplicates overlapping items.
 *
 * Tier 2 (Claude + corpus confirmation via Log Dice) is not yet implemented.
 *
 * @param calqueFlags - Flags from deterministic calque detection (already high confidence).
 * @param claudeItems - Raw naturalness issues from the Claude analysis response.
 * @returns Unified, deduplicated array of naturalness flag inputs.
 */
export function mergeNaturalnessFlags(
  calqueFlags: NaturalnessFlagInput[],
  claudeItems: ClaudeNaturalnessItem[],
): NaturalnessFlagInput[] {
  const merged: NaturalnessFlagInput[] = [...calqueFlags];

  for (const item of claudeItems) {
    if (isDuplicate(item, calqueFlags)) continue;

    const dimension = parseDimension(item.dimension);
    merged.push({
      originalPhrase: item.original,
      suggestedPhrase: item.suggested,
      flagType: inferFlagType(dimension),
      dimension,
      confidence: 'low',
      collocationMetric: null,
      metricValue: null,
      l1TransferSource: null,
      rationale: item.rationale,
      shownToUser: true,
    });
  }

  return merged;
}
