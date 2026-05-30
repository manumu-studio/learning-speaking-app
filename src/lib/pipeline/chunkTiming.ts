// Computes session timeline offsets for chunked recording segments
export interface ChunkTimingInput {
  durationSecs: number;
  overlapSecs: number;
}

export interface ChunkTimeRange {
  startMs: number;
  endMs: number;
}

/** Maps a chunk index to its absolute start/end times in the full session. */
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
