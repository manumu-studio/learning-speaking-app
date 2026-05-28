// Per-segment transcript and pronunciation breakdown for chunked sessions
import { useChunkBreakdown } from './useChunkBreakdown';
import type { ChunkBreakdownProps } from './ChunkBreakdown.types';

export function ChunkBreakdown({ chunks }: ChunkBreakdownProps) {
  const { strongestChunk, weakestChunk } = useChunkBreakdown(chunks);

  if (chunks.length === 0) {
    return null;
  }

  return (
    <section className="space-y-4" aria-label="Segment breakdown">
      {(strongestChunk || weakestChunk) && (
        <div className="grid gap-3 sm:grid-cols-2">
          {strongestChunk && (
            <div className="rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-900 dark:bg-green-950/40">
              <p className="text-xs font-semibold uppercase tracking-wide text-green-700 dark:text-green-300">
                Strongest segment
              </p>
              <p className="mt-1 text-sm text-green-900 dark:text-green-100">
                Chunk {strongestChunk.chunkIndex + 1} —{' '}
                {Math.round(strongestChunk.accuracyScore ?? strongestChunk.pronScore ?? 0)}% accuracy
              </p>
            </div>
          )}
          {weakestChunk && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/40">
              <p className="text-xs font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-300">
                Focus segment
              </p>
              <p className="mt-1 text-sm text-amber-900 dark:text-amber-100">
                Chunk {weakestChunk.chunkIndex + 1} —{' '}
                {Math.round(weakestChunk.accuracyScore ?? weakestChunk.pronScore ?? 0)}% accuracy
              </p>
            </div>
          )}
        </div>
      )}

      <div className="space-y-3">
        {chunks.map((chunk) => (
          <article
            key={chunk.chunkIndex}
            className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900"
          >
            <header className="mb-2 flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                Segment {chunk.chunkIndex + 1}
              </h3>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {Math.floor(chunk.durationSecs / 60)}:
                {(chunk.durationSecs % 60).toString().padStart(2, '0')}
              </span>
            </header>
            {chunk.transcriptText && (
              <p className="text-sm leading-relaxed text-gray-700 dark:text-gray-300">
                {chunk.transcriptText}
              </p>
            )}
            <dl className="mt-3 grid grid-cols-2 gap-2 text-xs text-gray-600 dark:text-gray-400 sm:grid-cols-4">
              <div>
                <dt className="font-medium">Accuracy</dt>
                <dd>{chunk.accuracyScore != null ? `${Math.round(chunk.accuracyScore)}%` : '—'}</dd>
              </div>
              <div>
                <dt className="font-medium">Fluency</dt>
                <dd>{chunk.fluencyScore != null ? `${Math.round(chunk.fluencyScore)}%` : '—'}</dd>
              </div>
              <div>
                <dt className="font-medium">Prosody</dt>
                <dd>{chunk.prosodyScore != null ? `${Math.round(chunk.prosodyScore)}%` : '—'}</dd>
              </div>
              <div>
                <dt className="font-medium">Words</dt>
                <dd>{chunk.wordCount ?? '—'}</dd>
              </div>
            </dl>
          </article>
        ))}
      </div>
    </section>
  );
}
