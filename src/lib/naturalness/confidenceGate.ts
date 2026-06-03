// Assigns confidence tiers and merges detection sources into unified naturalness flags
import type { NaturalnessFlagInput, NaturalnessFlagType, NaturalnessDimension, NaturalnessConfidence } from './naturalness.types';
import type { CorpusEvidence } from '@/lib/analysis/analysis.types';

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

// Stop words for extracting content-word pairs from Claude-flagged phrases
const ENRICHMENT_STOP_WORDS = new Set([
  'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'have', 'has', 'had', 'do', 'does', 'did', 'in', 'on', 'at', 'to',
  'of', 'and', 'or', 'but', 'for', 'with', 'by', 'from', 'as', 'not',
  'it', 'i', 'my', 'we', 'you', 'they', 'this', 'that',
]);

function extractContentPair(phrase: string): { head: string; collocate: string } | null {
  const words = phrase.toLowerCase().split(/\s+/).filter((w) => !ENRICHMENT_STOP_WORDS.has(w) && w.length > 1);
  if (words.length < 2) return null;
  return { head: words[0] ?? '', collocate: words[1] ?? '' };
}

type CorpusEnrichment = {
  confidence: NaturalnessConfidence;
  collocationMetric: string | null;
  metricValue: number | null;
};

function enrichFromCorpus(item: ClaudeNaturalnessItem, evidence: CorpusEvidence): CorpusEnrichment {
  const pair = extractContentPair(item.original);

  // Check collocation match
  if (pair !== null) {
    const match = evidence.collocations.find(
      (c) => c.head === pair.head && c.collocate === pair.collocate && c.lookup !== null,
    );
    if (match?.lookup !== undefined && match.lookup !== null) {
      const logDice = match.lookup.logDice ?? 0;
      if (match.lookup.attested && logDice >= 5) {
        return { confidence: 'high', collocationMetric: 'logDice', metricValue: logDice };
      }
      if (match.lookup.attested) {
        return { confidence: 'medium', collocationMetric: 'logDice', metricValue: logDice };
      }
      return { confidence: 'low', collocationMetric: 'logDice', metricValue: 0 };
    }
  }

  // Check MWE match
  const mweMatch = evidence.expressions.find(
    (e) => item.original.toLowerCase().includes(e.phrase) && e.lookup !== null,
  );
  if (mweMatch?.lookup !== undefined && mweMatch.lookup !== null) {
    return { confidence: 'medium', collocationMetric: 'mwe_freq', metricValue: mweMatch.lookup.freq ?? 0 };
  }

  return { confidence: 'low', collocationMetric: null, metricValue: null };
}

/**
 * Merges deterministic calque flags (Tier 1), corpus-confirmed items (Tier 2), and
 * Claude-only items (Tier 3) into a unified naturalness flag array.
 *
 * Tier 1: Deterministic calque flags (high confidence, unchanged).
 * Tier 2: Claude + corpus confirmation (medium/high confidence when corpus data matches).
 * Tier 3: Claude-only, no corpus confirmation (low confidence).
 *
 * @param calqueFlags - Flags from deterministic calque detection (already high confidence).
 * @param claudeItems - Raw naturalness issues from the Claude analysis response.
 * @param corpusEvidence - Optional corpus evidence for Tier 2 enrichment.
 * @returns Unified, deduplicated array of naturalness flag inputs.
 */
export function mergeNaturalnessFlags(
  calqueFlags: NaturalnessFlagInput[],
  claudeItems: ClaudeNaturalnessItem[],
  corpusEvidence?: CorpusEvidence | null,
): NaturalnessFlagInput[] {
  const merged: NaturalnessFlagInput[] = [...calqueFlags];

  for (const item of claudeItems) {
    if (isDuplicate(item, calqueFlags)) continue;

    const dimension = parseDimension(item.dimension);
    const enrichment = corpusEvidence != null
      ? enrichFromCorpus(item, corpusEvidence)
      : { confidence: 'low' as const, collocationMetric: null, metricValue: null };

    merged.push({
      originalPhrase: item.original,
      suggestedPhrase: item.suggested,
      flagType: inferFlagType(dimension),
      dimension,
      confidence: enrichment.confidence,
      collocationMetric: enrichment.collocationMetric,
      metricValue: enrichment.metricValue,
      l1TransferSource: null,
      rationale: item.rationale,
      shownToUser: true,
    });
  }

  return merged;
}
