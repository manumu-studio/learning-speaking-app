// Manages chunked session lifecycle — presign, R2 PUT, enqueue, and session completion
'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { ChunkReadyEvent } from '@/features/recording/useAudioWorklet.types';
import { useChunkUploaderSession } from './useChunkUploaderSession';
import { useChunkUploaderUpload } from './useChunkUploaderUpload';

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
  uploadChunkIndependent: (event: ChunkReadyEvent) => void;
  abortAllUploads: () => void;
  completeSession: (totalDurationSecs: number) => Promise<string | null>;
  ensureSession: () => Promise<string>;
  isUploading: boolean;
  inFlightChunks: number;
  error: string | null;
  resetUploader: () => void;
  waitForInFlightUploads: (timeoutMs?: number) => Promise<void>;
}

export function useChunkUploader(config: ChunkUploaderConfig = {}): UseChunkUploaderReturn {
  const [chunks, setChunks] = useState<ChunkUploadState[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [inFlightChunks, setInFlightChunks] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const configRef = useRef(config);
  const sessionIdRef = useRef<string | null>(null);
  const sessionInitRef = useRef<Promise<string> | null>(null);
  const queueRef = useRef<Promise<void>>(Promise.resolve());
  const activeUploadsRef = useRef(0);
  const inFlightCountRef = useRef(0);
  const abortControllersRef = useRef<Map<number, AbortController>>(new Map());
  const maxChunkIndexRef = useRef(-1);

  useEffect(() => { configRef.current = config; }, [config]);

  const { ensureSession, completeSession } = useChunkUploaderSession(
    { sessionIdRef, sessionInitRef, configRef, maxChunkIndexRef, queueRef },
    { setSessionId, setError },
  );

  const { uploadChunk, uploadChunkIndependent, abortAllUploads } = useChunkUploaderUpload(
    { queueRef, activeUploadsRef, inFlightCountRef, abortControllersRef, maxChunkIndexRef },
    { setChunks, setIsUploading, setInFlightChunks, setError },
    ensureSession,
  );

  const waitForInFlightUploads = useCallback(async (timeoutMs = 30_000): Promise<void> => {
    const start = Date.now();
    while (inFlightCountRef.current > 0 && Date.now() - start < timeoutMs) {
      await new Promise<void>((resolve) => { setTimeout(resolve, 500); });
    }
  }, [inFlightCountRef]);

  const resetUploader = useCallback(() => {
    sessionIdRef.current = null;
    sessionInitRef.current = null;
    setSessionId(null);
    setChunks([]);
    setError(null);
    setIsUploading(false);
    activeUploadsRef.current = 0;
    abortControllersRef.current.clear();
    inFlightCountRef.current = 0;
    setInFlightChunks(0);
    maxChunkIndexRef.current = -1;
    queueRef.current = Promise.resolve();
  }, []);

  return {
    chunks, sessionId, uploadChunk, uploadChunkIndependent, abortAllUploads,
    completeSession, ensureSession, isUploading, inFlightChunks, error,
    resetUploader, waitForInFlightUploads,
  };
}
