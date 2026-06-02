// Upload action callbacks — queued and independent chunk upload pipelines
'use client';

import { useCallback } from 'react';
import { presignChunk, putChunkToStorage, enqueueChunk } from './useChunkUploaderHelpers';
import type { ChunkReadyEvent } from '@/features/recording/useAudioWorklet.types';
import type { ChunkUploadState } from './useChunkUploader';

interface UploadRefs {
  queueRef: React.MutableRefObject<Promise<void>>;
  activeUploadsRef: React.MutableRefObject<number>;
  inFlightCountRef: React.MutableRefObject<number>;
  abortControllersRef: React.MutableRefObject<Map<number, AbortController>>;
  maxChunkIndexRef: React.MutableRefObject<number>;
}

interface UploadSetters {
  setChunks: React.Dispatch<React.SetStateAction<ChunkUploadState[]>>;
  setIsUploading: (v: boolean) => void;
  setInFlightChunks: (v: number) => void;
  setError: (v: string | null) => void;
}

export interface UploadActions {
  uploadChunk: (event: ChunkReadyEvent) => void;
  uploadChunkIndependent: (event: ChunkReadyEvent) => void;
  abortAllUploads: () => void;
  markChunkFailed: (chunkIndex: number, message: string) => void;
  markChunkCompleted: (chunkIndex: number) => void;
  decrementActive: () => void;
}

export function useChunkUploaderUpload(
  refs: UploadRefs,
  setters: UploadSetters,
  ensureSession: () => Promise<string>,
): UploadActions {
  const { queueRef, activeUploadsRef, inFlightCountRef, abortControllersRef, maxChunkIndexRef } = refs;
  const { setChunks, setIsUploading, setInFlightChunks, setError } = setters;

  const markChunkFailed = useCallback((chunkIndex: number, message: string) => {
    setChunks((prev) =>
      prev.map((c) => c.chunkIndex === chunkIndex ? { ...c, status: 'failed' as const, error: message } : c),
    );
  }, [setChunks]);

  const markChunkCompleted = useCallback((chunkIndex: number) => {
    setChunks((prev) =>
      prev.map((c) => c.chunkIndex === chunkIndex ? { ...c, status: 'completed' as const } : c),
    );
  }, [setChunks]);

  const decrementActive = useCallback(() => {
    activeUploadsRef.current -= 1;
    if (activeUploadsRef.current === 0) setIsUploading(false);
  }, [activeUploadsRef, setIsUploading]);

  const uploadChunk = useCallback((event: ChunkReadyEvent) => {
    maxChunkIndexRef.current = Math.max(maxChunkIndexRef.current, event.chunkIndex);
    setChunks((prev) => [...prev, { chunkIndex: event.chunkIndex, status: 'uploading' }]);
    activeUploadsRef.current += 1;
    setIsUploading(true);

    queueRef.current = queueRef.current.then(async () => {
      try {
        const sid = await ensureSession();
        const presign = await presignChunk(sid, event.chunkIndex);
        await putChunkToStorage(presign.uploadUrl, event.wavBlob);
        await enqueueChunk(sid, { chunkIndex: event.chunkIndex, durationSecs: event.durationSecs, storageKey: presign.storageKey }, 'enqueue');
        markChunkCompleted(event.chunkIndex);
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Chunk upload failed';
        setError(msg);
        markChunkFailed(event.chunkIndex, msg);
      } finally {
        decrementActive();
      }
    });
  }, [activeUploadsRef, decrementActive, ensureSession, markChunkCompleted, markChunkFailed, maxChunkIndexRef, queueRef, setChunks, setError, setIsUploading]);

  const uploadChunkIndependent = useCallback((event: ChunkReadyEvent) => {
    maxChunkIndexRef.current = Math.max(maxChunkIndexRef.current, event.chunkIndex);
    const abort = new AbortController();
    abortControllersRef.current.set(event.chunkIndex, abort);
    inFlightCountRef.current += 1;
    setInFlightChunks(inFlightCountRef.current);
    activeUploadsRef.current += 1;
    setIsUploading(true);
    setChunks((prev) => [...prev, { chunkIndex: event.chunkIndex, status: 'uploading' }]);

    void (async () => {
      try {
        const sid = await ensureSession();
        const presign = await presignChunk(sid, event.chunkIndex, abort.signal);
        await putChunkToStorage(presign.uploadUrl, event.wavBlob, abort.signal);
        await enqueueChunk(sid, { chunkIndex: event.chunkIndex, durationSecs: event.durationSecs, storageKey: presign.storageKey }, 'enqueue-independent', abort.signal);
        markChunkCompleted(event.chunkIndex);
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') { markChunkFailed(event.chunkIndex, 'Cancelled'); return; }
        const msg = err instanceof Error ? err.message : 'Chunk upload failed';
        setError(msg);
        markChunkFailed(event.chunkIndex, msg);
      } finally {
        abortControllersRef.current.delete(event.chunkIndex);
        inFlightCountRef.current -= 1;
        setInFlightChunks(inFlightCountRef.current);
        decrementActive();
      }
    })();
  }, [abortControllersRef, activeUploadsRef, decrementActive, ensureSession, inFlightCountRef, markChunkCompleted, markChunkFailed, maxChunkIndexRef, setChunks, setError, setInFlightChunks, setIsUploading]);

  const abortAllUploads = useCallback(() => {
    for (const controller of abortControllersRef.current.values()) controller.abort();
    abortControllersRef.current.clear();
  }, [abortControllersRef]);

  return { uploadChunk, uploadChunkIndependent, abortAllUploads, markChunkFailed, markChunkCompleted, decrementActive };
}
