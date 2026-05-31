// Polls per-chunk results while recording is in progress for progressive feedback
'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { z } from 'zod';

const chunkResultItemSchema = z.object({
  chunkIndex: z.number(),
  transcriptSnippet: z.string().nullable(),
  wordCount: z.number().nullable(),
  pronScore: z.number().nullable(),
  status: z.string(),
  updatedAt: z.string(),
});

const chunkResultsResponseSchema = z.object({
  chunks: z.array(chunkResultItemSchema),
});

export type ChunkResultPreview = z.infer<typeof chunkResultItemSchema>;

interface UseProgressiveResultsOptions {
  sessionId: string | null;
  isRecording: boolean;
  elapsedSecs: number;
  minDurationSecs?: number;
}

const POLL_INTERVAL_MS = 10_000;

export function useProgressiveResults({
  sessionId,
  isRecording,
  elapsedSecs,
  minDurationSecs = 130,
}: UseProgressiveResultsOptions): { completedChunks: ChunkResultPreview[] } {
  const [polledChunks, setPolledChunks] = useState<ChunkResultPreview[]>([]);

  const shouldPoll = isRecording && elapsedSecs >= minDurationSecs && sessionId !== null;

  const fetchChunkResults = useCallback(async (id: string, signal: AbortSignal) => {
    try {
      const response = await fetch(`/api/sessions/${id}/chunk-results`, { signal });
      if (!response.ok) return;
      const data = chunkResultsResponseSchema.parse(await response.json());
      if (!signal.aborted) {
        setPolledChunks(data.chunks);
      }
    } catch {
      // Non-fatal — progressive results are best-effort
    }
  }, []);

  useEffect(() => {
    if (!shouldPoll || !sessionId) return;

    const controller = new AbortController();
    const poll = () => void fetchChunkResults(sessionId, controller.signal);
    const timer = setInterval(poll, POLL_INTERVAL_MS);

    return () => {
      controller.abort();
      clearInterval(timer);
    };
  }, [shouldPoll, sessionId, fetchChunkResults]);

  const completedChunks = useMemo(
    () => (shouldPoll ? polledChunks : []),
    [shouldPoll, polledChunks],
  );

  return { completedChunks };
}
