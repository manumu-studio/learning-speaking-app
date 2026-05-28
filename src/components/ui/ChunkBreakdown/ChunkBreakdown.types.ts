// Types for per-chunk breakdown on session results page
export interface SessionChunkDetail {
  chunkIndex: number;
  durationSecs: number;
  transcriptText: string | null;
  wordCount: number | null;
  accuracyScore: number | null;
  fluencyScore: number | null;
  prosodyScore: number | null;
  pronScore: number | null;
  status: string;
}

export interface ChunkBreakdownProps {
  chunks: SessionChunkDetail[];
}

export interface UseChunkBreakdownReturn {
  strongestChunk: SessionChunkDetail | null;
  weakestChunk: SessionChunkDetail | null;
}
