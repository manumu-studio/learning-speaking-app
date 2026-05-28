// Shows per-chunk upload and recording progress during chunked capture
import type { ChunkProgressBarProps } from './ChunkProgressBar.types';

const STATUS_LABELS = {
  pending: 'Pending',
  recording: 'Recording',
  uploading: 'Uploading',
  completed: 'Done',
  failed: 'Failed',
} as const;

const STATUS_CLASSES = {
  pending: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300',
  recording: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300 animate-pulse',
  uploading: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
  completed: 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300',
  failed: 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300',
} as const;

export function ChunkProgressBar({ chunks, activeChunkIndex }: ChunkProgressBarProps) {
  if (chunks.length === 0) {
    return null;
  }

  return (
    <div
      className="flex flex-wrap items-center justify-center gap-2 w-full"
      aria-label="Chunk upload progress"
      data-testid="chunk-progress-bar"
    >
      {chunks.map((chunk) => {
        const status =
          chunk.chunkIndex === activeChunkIndex && chunk.status === 'pending'
            ? 'recording'
            : chunk.status;

        return (
          <span
            key={chunk.chunkIndex}
            className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_CLASSES[status]}`}
          >
            Chunk {chunk.chunkIndex + 1}: {STATUS_LABELS[status]}
          </span>
        );
      })}
    </div>
  );
}
