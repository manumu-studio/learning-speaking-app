// Scans a transcript for deterministic calque matches from the hardcoded checklist
import { CALQUE_LIST } from './calqueList';
import type { CalqueEntry } from './calqueList.types';
import type { NaturalnessFlagInput } from './naturalness.types';

/** Context window (in chars) captured around a match for the originalPhrase field. */
const CONTEXT_RADIUS = 40;

/**
 * Extracts a context snippet around the matched portion of the transcript.
 *
 * @param text - Full transcript text.
 * @param matchStart - Start index of the match.
 * @param matchEnd - End index of the match.
 * @returns A trimmed context snippet with the match highlighted.
 */
function extractContext(text: string, matchStart: number, matchEnd: number): string {
  const start = Math.max(0, matchStart - CONTEXT_RADIUS);
  const end = Math.min(text.length, matchEnd + CONTEXT_RADIUS);
  const prefix = start > 0 ? '...' : '';
  const suffix = end < text.length ? '...' : '';
  return `${prefix}${text.slice(start, end).trim()}${suffix}`;
}

/**
 * Checks a single calque entry against the transcript and returns a flag if matched.
 */
function matchCalque(entry: CalqueEntry, transcript: string): NaturalnessFlagInput | null {
  const regex = entry.pattern ?? new RegExp(`\\b${entry.trigger}\\b`, 'i');
  const match = regex.exec(transcript);
  if (!match) return null;

  const matchStart = match.index;
  const matchEnd = matchStart + match[0].length;

  return {
    originalPhrase: extractContext(transcript, matchStart, matchEnd),
    suggestedPhrase: entry.correction,
    flagType: entry.flagType,
    dimension: entry.dimension,
    confidence: 'high',
    collocationMetric: null,
    metricValue: null,
    l1TransferSource: entry.l1Source,
    rationale: entry.rationale,
    shownToUser: true,
  };
}

/**
 * Scans a transcript for all matching calque patterns from the deterministic checklist.
 *
 * Each calque is matched at most once (first occurrence). Results are Tier 1 (high confidence).
 *
 * @param transcript - The full session transcript text.
 * @returns Array of naturalness flag inputs ready for persistence.
 */
export function detectCalques(transcript: string): NaturalnessFlagInput[] {
  if (transcript.trim().length === 0) return [];

  const flags: NaturalnessFlagInput[] = [];
  for (const entry of CALQUE_LIST) {
    const flag = matchCalque(entry, transcript);
    if (flag !== null) {
      flags.push(flag);
    }
  }
  return flags;
}
