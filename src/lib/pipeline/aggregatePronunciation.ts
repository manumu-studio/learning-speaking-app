// Aggregates Azure pronunciation scores across chunked recordings using duration weighting
import type { PronunciationResult, WordResult } from '@/lib/ai/azurePronunciation.types';

export interface ChunkPronunciationInput {
  chunkIndex: number;
  durationSecs: number;
  overlapSecs: number;
  pronScore: number | null;
  accuracyScore: number | null;
  fluencyScore: number | null;
  completenessScore: number | null;
  prosodyScore: number | null;
  speakingRateWpm: number | null;
  pronWords: WordResult[] | null;
  pronRawJson: unknown[] | null;
}

export interface AggregatedPronunciation {
  pronScore: number;
  accuracyScore: number;
  fluencyScore: number;
  completenessScore: number;
  prosodyScore: number;
  speakingRateWpm: number;
  words: WordResult[];
  rawUtterances: unknown[];
}

function weightedAverage(
  values: Array<{ value: number; weight: number }>,
): number {
  const totalWeight = values.reduce((sum, entry) => sum + entry.weight, 0);
  if (totalWeight === 0) {
    return 0;
  }

  const weightedSum = values.reduce(
    (sum, entry) => sum + entry.value * entry.weight,
    0,
  );
  return weightedSum / totalWeight;
}

function reindexWords(words: WordResult[], offsetMs: number): WordResult[] {
  return words.map((word) => ({
    ...word,
    offsetMs: word.offsetMs + offsetMs,
  }));
}

/**
 * Combines chunk-level Azure pronunciation scores and word rows into a single session-level result.
 *
 * Each score (pronScore, accuracyScore, fluencyScore, completenessScore, prosodyScore, speakingRate)
 * is computed as a duration-weighted average where weight = max(1, durationSecs - overlapSecs).
 * Word timestamps are reindexed so they reflect absolute session offsets.
 *
 * @param chunks - Array of per-chunk pronunciation data; chunks with any null score are skipped.
 * @returns An `AggregatedPronunciation` covering all scored chunks, or `null` if no chunks have scores.
 */
export function aggregatePronunciation(
  chunks: ChunkPronunciationInput[],
): AggregatedPronunciation | null {
  const scoredChunks = chunks.filter(
    (chunk) =>
      chunk.pronScore !== null &&
      chunk.accuracyScore !== null &&
      chunk.fluencyScore !== null &&
      chunk.completenessScore !== null &&
      chunk.prosodyScore !== null,
  );

  if (scoredChunks.length === 0) {
    return null;
  }

  const weights = scoredChunks.map((chunk) => ({
    value: chunk.pronScore ?? 0,
    weight: Math.max(1, chunk.durationSecs - chunk.overlapSecs),
  }));

  const accuracyWeights = scoredChunks.map((chunk) => ({
    value: chunk.accuracyScore ?? 0,
    weight: Math.max(1, chunk.durationSecs - chunk.overlapSecs),
  }));

  const fluencyWeights = scoredChunks.map((chunk) => ({
    value: chunk.fluencyScore ?? 0,
    weight: Math.max(1, chunk.durationSecs - chunk.overlapSecs),
  }));

  const completenessWeights = scoredChunks.map((chunk) => ({
    value: chunk.completenessScore ?? 0,
    weight: Math.max(1, chunk.durationSecs - chunk.overlapSecs),
  }));

  const prosodyWeights = scoredChunks.map((chunk) => ({
    value: chunk.prosodyScore ?? 0,
    weight: Math.max(1, chunk.durationSecs - chunk.overlapSecs),
  }));

  const speakingRateWeights = scoredChunks
    .filter((chunk) => chunk.speakingRateWpm !== null)
    .map((chunk) => ({
      value: chunk.speakingRateWpm ?? 0,
      weight: Math.max(1, chunk.durationSecs - chunk.overlapSecs),
    }));

  const mergedWords: WordResult[] = [];
  const rawUtterances: unknown[] = [];
  let offsetMs = 0;

  for (const chunk of scoredChunks) {
    const chunkWords = chunk.pronWords ?? [];
    mergedWords.push(...reindexWords(chunkWords, offsetMs));
    if (chunk.pronRawJson) {
      rawUtterances.push(...chunk.pronRawJson);
    }
    offsetMs += Math.max(0, (chunk.durationSecs - chunk.overlapSecs) * 1000);
  }

  return {
    pronScore: weightedAverage(weights),
    accuracyScore: weightedAverage(accuracyWeights),
    fluencyScore: weightedAverage(fluencyWeights),
    completenessScore: weightedAverage(completenessWeights),
    prosodyScore: weightedAverage(prosodyWeights),
    speakingRateWpm: speakingRateWeights.length > 0
      ? weightedAverage(speakingRateWeights)
      : 0,
    words: mergedWords,
    rawUtterances,
  };
}

/**
 * Converts an `AggregatedPronunciation` into the canonical `PronunciationResult` shape.
 *
 * Strips the internal `speakingRateWpm` field (not part of `PronunciationResult`) and
 * re-maps all score fields, producing the shape expected by downstream persist helpers.
 *
 * @param aggregated - Duration-weighted aggregate from {@link aggregatePronunciation}.
 * @returns A `PronunciationResult` compatible with the Azure client output format.
 */
export function toPronunciationResult(
  aggregated: AggregatedPronunciation,
): PronunciationResult {
  return {
    pronScore: aggregated.pronScore,
    accuracyScore: aggregated.accuracyScore,
    fluencyScore: aggregated.fluencyScore,
    completenessScore: aggregated.completenessScore,
    prosodyScore: aggregated.prosodyScore,
    words: aggregated.words,
    rawUtterances: aggregated.rawUtterances,
  };
}
