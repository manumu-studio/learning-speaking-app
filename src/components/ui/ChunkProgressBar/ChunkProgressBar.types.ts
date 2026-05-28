// Types for ChunkProgressBar — per-chunk upload status during recording
export type ChunkProgressStatus = 'pending' | 'uploading' | 'completed' | 'failed' | 'recording';

export interface ChunkProgressItem {
  chunkIndex: number;
  status: ChunkProgressStatus;
}

export interface ChunkProgressBarProps {
  chunks: ChunkProgressItem[];
  activeChunkIndex: number;
}
