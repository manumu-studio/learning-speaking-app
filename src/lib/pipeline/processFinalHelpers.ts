// Shared helper functions for processFinal and processParallelFinal fan-in workers
import { Prisma } from '@prisma/client';
import { toPronunciationResult } from '@/lib/pipeline/aggregatePronunciation';
import type { TranscriptWord } from '@/lib/pipeline/transcriptDedup';
import type { WordResult } from '@/lib/ai/azurePronunciation.types';
import type { PronunciationSummary } from '@/lib/ai/analyze';
import { isRecord } from '@/lib/typeGuards';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

/**
 * Derives a lean `PronunciationSummary` from an aggregated Azure pronunciation result.
 *
 * Extracts the top 5 weak phonemes (accuracy < 60) and de-duplicates L1 tags across
 * all words to produce the context object passed to Claude.
 *
 * @param result - Aggregated pronunciation result from `toPronunciationResult()`, or `null` if unavailable.
 * @returns A `PronunciationSummary` for use in `analyzeTranscript`, or `null` if `result` is null.
 */
export function buildPronunciationSummary(
  result: ReturnType<typeof toPronunciationResult> | null,
): PronunciationSummary | null {
  if (result == null) {
    return null;
  }

  const weakPhonemes = result.words
    .flatMap((word) => word.phonemes)
    .filter((phoneme) => phoneme.accuracyScore < 60)
    .map((phoneme) => phoneme.phoneme)
    .slice(0, 5);

  const l1Tags = [...new Set(result.words.flatMap((word) => word.l1Tags ?? []))];

  return {
    topWeakPhonemes: weakPhonemes,
    l1Tags,
    accuracyScore: result.accuracyScore,
    prosodyScore: result.prosodyScore,
  };
}

/**
 * Parses a Prisma JSON value into a typed `TranscriptWord[]`, returning `[]` on any mismatch.
 *
 * Guards against arbitrary JSON stored in the DB; only entries that conform to
 * `{ word: string, start: number, end: number }` are included.
 *
 * @param value - Raw `Prisma.JsonValue` from a `words` column, or `null`.
 * @returns A typed array of transcript words (may be empty).
 */
export function parseWords(value: Prisma.JsonValue | null): TranscriptWord[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((entry) => {
    if (
      typeof entry === 'object' &&
      entry !== null &&
      'word' in entry &&
      'start' in entry &&
      'end' in entry &&
      typeof entry.word === 'string' &&
      typeof entry.start === 'number' &&
      typeof entry.end === 'number'
    ) {
      return [{ word: entry.word, start: entry.start, end: entry.end }];
    }
    return [];
  });
}

function isWordResultLike(
  entry: unknown,
): entry is WordResult {
  if (!isRecord(entry)) {
    return false;
  }
  return (
    'word' in entry &&
    'accuracyScore' in entry &&
    'offsetMs' in entry &&
    'durationMs' in entry &&
    'phonemes' in entry &&
    typeof entry['word'] === 'string' &&
    typeof entry['accuracyScore'] === 'number' &&
    typeof entry['offsetMs'] === 'number' &&
    typeof entry['durationMs'] === 'number' &&
    Array.isArray(entry['phonemes'])
  );
}

/**
 * Parses a Prisma JSON value into a typed `WordResult[]`, returning `null` if any entry fails validation.
 *
 * Unlike `parseWords`, this function requires all entries to be valid — a single bad entry
 * causes the whole array to be rejected so callers can fall back to re-fetching.
 *
 * @param value - Raw `Prisma.JsonValue` from a pronunciation words column, or `null`.
 * @returns A fully typed `WordResult[]` if every entry validates, otherwise `null`.
 */
export function parsePronWords(value: Prisma.JsonValue | null): WordResult[] | null {
  if (!Array.isArray(value)) {
    return null;
  }
  const results = value.flatMap((entry) =>
    isWordResultLike(entry) ? [entry] : [],
  );
  return results.length === value.length ? results : null;
}

/**
 * Type guard — returns `true` if the Prisma JSON value is a `JsonArray`.
 *
 * @param value - Any `Prisma.JsonValue`, or `null`.
 * @returns `true` when the value is an array; narrows the type to `Prisma.JsonArray`.
 */
export function isJsonArray(value: Prisma.JsonValue | null): value is Prisma.JsonArray {
  return Array.isArray(value);
}

/**
 * Deletes the cached DailySummary for a user's session date so it regenerates
 * on next history view. Failures are logged but never rethrown — pipeline must continue.
 */
export async function invalidateDailySummary(userId: string, sessionCreatedAt: Date): Promise<void> {
  try {
    const dateStr = sessionCreatedAt.toISOString().split('T')[0] as string;
    await prisma.dailySummary.deleteMany({
      where: { userId, date: new Date(`${dateStr}T00:00:00.000Z`) },
    });
  } catch (err) {
    logger.error({ err, userId }, 'Failed to invalidate daily summary');
  }
}
