// Computes session timeline offsets for chunked recording segments
export interface ChunkTimingInput {
  durationSecs: number;
  overlapSecs: number;
}

export interface ChunkTimeRange {
  startMs: number;
  endMs: number;
}

/**
 * Maps a chunk index to its absolute start and end times within the full session.
 *
 * Walks all prior chunks, summing their effective durations (durationSecs − overlapSecs),
 * then adds the current chunk's full duration for the end offset.
 *
 * @param chunkIndex - Zero-based index of the target chunk.
 * @param chunks - Ordered array of all chunk timing metadata for the session.
 * @returns A `ChunkTimeRange` with `startMs` and `endMs` in milliseconds.
 * @example
 * computeChunkTimeRange(1, [{ durationSecs: 30, overlapSecs: 5 }, { durationSecs: 30, overlapSecs: 5 }])
 * // => { startMs: 25000, endMs: 55000 }
 */
export function computeChunkTimeRange(
  chunkIndex: number,
  chunks: ChunkTimingInput[],
): ChunkTimeRange {
  let startMs = 0;

  for (let index = 0; index < chunkIndex; index += 1) {
    const prior = chunks[index];
    if (prior === undefined) {
      break;
    }
    const effectiveSecs = Math.max(0, prior.durationSecs - prior.overlapSecs);
    startMs += Math.round(effectiveSecs * 1000);
  }

  const current = chunks[chunkIndex];
  const durationMs = Math.round((current?.durationSecs ?? 0) * 1000);

  return {
    startMs,
    endMs: startMs + durationMs,
  };
}
