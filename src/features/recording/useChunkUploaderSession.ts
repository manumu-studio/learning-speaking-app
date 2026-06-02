// Session creation and completion logic for the chunk uploader
'use client';

import { useCallback } from 'react';
import { z } from 'zod';
import { parseError } from './useChunkUploaderHelpers';
import type { ChunkUploaderConfig } from './useChunkUploader';

const sessionCreateSchema = z.object({
  id: z.string(),
  status: z.string(),
});

const completeSchema = z.object({
  sessionId: z.string(),
  chunkCount: z.number(),
  status: z.string(),
});

interface SessionRefs {
  sessionIdRef: React.MutableRefObject<string | null>;
  sessionInitRef: React.MutableRefObject<Promise<string> | null>;
  configRef: React.MutableRefObject<ChunkUploaderConfig>;
  maxChunkIndexRef: React.MutableRefObject<number>;
  queueRef: React.MutableRefObject<Promise<void>>;
}

interface SessionSetters {
  setSessionId: (id: string | null) => void;
  setError: (err: string | null) => void;
}

export interface SessionActions {
  ensureSession: () => Promise<string>;
  completeSession: (totalDurationSecs: number) => Promise<string | null>;
}

export function useChunkUploaderSession(
  refs: SessionRefs,
  setters: SessionSetters,
): SessionActions {
  const { sessionIdRef, sessionInitRef, configRef, maxChunkIndexRef, queueRef } = refs;
  const { setSessionId, setError } = setters;

  const ensureSession = useCallback(async (): Promise<string> => {
    if (sessionIdRef.current) return sessionIdRef.current;
    if (sessionInitRef.current) return sessionInitRef.current;

    sessionInitRef.current = (async () => {
      const cfg = configRef.current;
      const body = {
        chunked: true,
        language: 'en',
        topic: cfg.focus?.focusLabel ?? cfg.topic ?? null,
        focusMetricKey: cfg.focus?.focusKey ?? null,
        promptUsed: cfg.promptUsed ?? null,
        isOnboarding: cfg.isOnboarding ?? false,
      };
      const response = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!response.ok) throw new Error(await parseError(response));
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
  }, [configRef, sessionIdRef, sessionInitRef, setSessionId]);

  const completeSession = useCallback(async (totalDurationSecs: number): Promise<string | null> => {
    await queueRef.current;
    const currentSessionId = sessionIdRef.current;
    if (!currentSessionId) return null;

    const chunkCount = Math.max(1, maxChunkIndexRef.current + 1);
    const response = await fetch(`/api/sessions/${currentSessionId}/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chunkCount, durationSecs: Math.max(1, totalDurationSecs) }),
    });

    if (!response.ok) {
      setError(await parseError(response));
      return null;
    }
    completeSchema.parse(await response.json());
    return currentSessionId;
  }, [maxChunkIndexRef, queueRef, sessionIdRef, setError]);

  return { ensureSession, completeSession };
}
