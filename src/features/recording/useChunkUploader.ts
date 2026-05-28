// Manages chunked session lifecycle — presign, R2 PUT, enqueue, and session completion
'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { z } from 'zod';
import type { ChunkReadyEvent } from '@/features/recording/useAudioWorklet.types';

const errorSchema = z.object({ error: z.string() });

const sessionCreateSchema = z.object({
  id: z.string(),
  status: z.string(),
});

const presignSchema = z.object({
  uploadUrl: z.string(),
  storageKey: z.string(),
  chunkIndex: z.number(),
});

const enqueueSchema = z.object({
  sessionId: z.string(),
  chunkIndex: z.number(),
  status: z.string(),
});

const completeSchema = z.object({
  sessionId: z.string(),
  chunkCount: z.number(),
  status: z.string(),
});

export type ChunkUploadStatus = 'pending' | 'uploading' | 'completed' | 'failed';

export interface ChunkUploadState {
  chunkIndex: number;
  status: ChunkUploadStatus;
  error?: string;
}

export interface ChunkUploaderConfig {
  topic?: string | undefined;
  focus?: { focusKey: string; focusLabel: string } | null | undefined;
  promptUsed?: string | null | undefined;
  isOnboarding?: boolean | undefined;
}

interface UseChunkUploaderReturn {
  chunks: ChunkUploadState[];
  sessionId: string | null;
  uploadChunk: (event: ChunkReadyEvent) => void;
  completeSession: (totalDurationSecs: number) => Promise<string | null>;
  ensureSession: () => Promise<string>;
  isUploading: boolean;
  error: string | null;
  resetUploader: () => void;
}

async function parseError(response: Response): Promise<string> {
  try {
    const data = errorSchema.parse(await response.json());
    return data.error;
  } catch {
    return 'Upload failed';
  }
}

export function useChunkUploader(config: ChunkUploaderConfig = {}): UseChunkUploaderReturn {
  const [chunks, setChunks] = useState<ChunkUploadState[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const configRef = useRef(config);
  const sessionIdRef = useRef<string | null>(null);
  const queueRef = useRef<Promise<void>>(Promise.resolve());
  const activeUploadsRef = useRef(0);
  const sessionInitRef = useRef<Promise<string> | null>(null);
  const maxChunkIndexRef = useRef(-1);

  useEffect(() => {
    configRef.current = config;
  }, [config]);

  const ensureSession = useCallback(async (): Promise<string> => {
    if (sessionIdRef.current) {
      return sessionIdRef.current;
    }

    if (sessionInitRef.current) {
      return sessionInitRef.current;
    }

    sessionInitRef.current = (async () => {
      const body = {
        chunked: true,
        language: 'en',
        topic: configRef.current.focus?.focusLabel ?? configRef.current.topic ?? null,
        focusMetricKey: configRef.current.focus?.focusKey ?? null,
        promptUsed: configRef.current.promptUsed ?? null,
        isOnboarding: configRef.current.isOnboarding ?? false,
      };

      const response = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        throw new Error(await parseError(response));
      }

      const data = sessionCreateSchema.parse(await response.json());
      sessionIdRef.current = data.id;
      setSessionId(data.id);
      return data.id;
    })();

    try {
      return await sessionInitRef.current;
    } finally {
      sessionInitRef.current = null;
    }
  }, []);

  const uploadChunk = useCallback((event: ChunkReadyEvent) => {
    maxChunkIndexRef.current = Math.max(maxChunkIndexRef.current, event.chunkIndex);

    setChunks((prev) => [
      ...prev,
      { chunkIndex: event.chunkIndex, status: 'uploading' },
    ]);

    activeUploadsRef.current += 1;
    setIsUploading(true);

    queueRef.current = queueRef.current.then(async () => {
      try {
        const currentSessionId = await ensureSession();

        const presignResponse = await fetch(`/api/sessions/${currentSessionId}/presign`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chunkIndex: event.chunkIndex }),
        });

        if (!presignResponse.ok) {
          throw new Error(await parseError(presignResponse));
        }

        const presignData = presignSchema.parse(await presignResponse.json());

        const putResponse = await fetch(presignData.uploadUrl, {
          method: 'PUT',
          headers: { 'Content-Type': 'audio/wav' },
          body: event.wavBlob,
        });

        if (!putResponse.ok) {
          throw new Error('Failed to upload chunk to storage');
        }

        const enqueueResponse = await fetch(
          `/api/sessions/${currentSessionId}/chunks/enqueue`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chunkIndex: event.chunkIndex,
              durationSecs: Math.max(1, Math.round(event.durationSecs)),
              storageKey: presignData.storageKey,
              overlapSecs: event.chunkIndex === 0 ? 0 : 1.5,
            }),
          },
        );

        if (!enqueueResponse.ok) {
          throw new Error(await parseError(enqueueResponse));
        }

        enqueueSchema.parse(await enqueueResponse.json());

        setChunks((prev) =>
          prev.map((chunk) =>
            chunk.chunkIndex === event.chunkIndex
              ? { ...chunk, status: 'completed' }
              : chunk,
          ),
        );
      } catch (uploadError) {
        const message =
          uploadError instanceof Error ? uploadError.message : 'Chunk upload failed';
        setError(message);
        setChunks((prev) =>
          prev.map((chunk) =>
            chunk.chunkIndex === event.chunkIndex
              ? { ...chunk, status: 'failed', error: message }
              : chunk,
          ),
        );
      } finally {
        activeUploadsRef.current -= 1;
        if (activeUploadsRef.current === 0) {
          setIsUploading(false);
        }
      }
    });
  }, [ensureSession]);

  const completeSession = useCallback(async (totalDurationSecs: number): Promise<string | null> => {
    const currentSessionId = sessionIdRef.current;
    if (!currentSessionId) {
      return null;
    }

    await queueRef.current;

    const chunkCount = Math.max(1, maxChunkIndexRef.current + 1);

    const response = await fetch(`/api/sessions/${currentSessionId}/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chunkCount,
        durationSecs: Math.max(1, totalDurationSecs),
      }),
    });

    if (!response.ok) {
      setError(await parseError(response));
      return null;
    }

    completeSchema.parse(await response.json());
    return currentSessionId;
  }, []);

  const resetUploader = useCallback(() => {
    sessionIdRef.current = null;
    sessionInitRef.current = null;
    setSessionId(null);
    setChunks([]);
    setError(null);
    setIsUploading(false);
    activeUploadsRef.current = 0;
    maxChunkIndexRef.current = -1;
    queueRef.current = Promise.resolve();
  }, []);

  return {
    chunks,
    sessionId,
    uploadChunk,
    completeSession,
    ensureSession,
    isUploading,
    error,
    resetUploader,
  };
}
