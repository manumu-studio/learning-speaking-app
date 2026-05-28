// Derives strongest and weakest chunk highlights from pronunciation scores
import { useMemo } from 'react';
import type {
  SessionChunkDetail,
  UseChunkBreakdownReturn,
} from './ChunkBreakdown.types';

function scoreOrZero(chunk: SessionChunkDetail): number {
  return chunk.accuracyScore ?? chunk.pronScore ?? 0;
}

export function useChunkBreakdown(chunks: SessionChunkDetail[]): UseChunkBreakdownReturn {
  return useMemo(() => {
    const scored = chunks.filter((chunk) => scoreOrZero(chunk) > 0);
    if (scored.length === 0) {
      return { strongestChunk: null, weakestChunk: null };
    }

    const sorted = [...scored].sort((a, b) => scoreOrZero(b) - scoreOrZero(a));
    return {
      strongestChunk: sorted[0] ?? null,
      weakestChunk: sorted[sorted.length - 1] ?? null,
    };
  }, [chunks]);
}
