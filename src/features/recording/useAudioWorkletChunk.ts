// Chunk-ready handler, PCM forwarding, and worker creation for AudioWorklet recording
'use client';

import { useCallback } from 'react';
import { createChunkWorkerInstance, DEFAULT_SAMPLE_RATE, DEFAULT_CHUNK_DURATION_SECS, DEFAULT_OVERLAP_SECS } from './useAudioWorkletHelpers';
import type { ChunkReadyMessage } from '@/features/recording/workers/wav-chunker.worker';
import type { AudioWorkletRecordingState, ChunkReadyEvent, UseAudioWorkletOptions } from './useAudioWorklet.types';

export interface UseAudioWorkletChunkOptions {
  chunkWorkerRef: React.MutableRefObject<Worker | null>;
  chunkIndexRef: React.MutableRefObject<number>;
  optionsRef: React.MutableRefObject<UseAudioWorkletOptions>;
  setState: React.Dispatch<React.SetStateAction<AudioWorkletRecordingState>>;
  setChunkIndex: React.Dispatch<React.SetStateAction<number>>;
  setError: React.Dispatch<React.SetStateAction<string | null>>;
}

export interface UseAudioWorkletChunkReturn {
  handleChunkReady: (message: ChunkReadyMessage) => void;
  forwardPcmToWorker: (samples: ArrayBuffer) => void;
  createChunkWorker: () => Worker;
}

export function useAudioWorkletChunk({
  chunkWorkerRef,
  chunkIndexRef,
  optionsRef,
  setState,
  setChunkIndex,
  setError,
}: UseAudioWorkletChunkOptions): UseAudioWorkletChunkReturn {
  const handleChunkReady = useCallback((message: ChunkReadyMessage) => {
    const wavBlob = new Blob([message.wavBuffer], { type: 'audio/wav' });
    chunkIndexRef.current = message.chunkIndex + 1;
    setChunkIndex(message.chunkIndex + 1);
    const event: ChunkReadyEvent = {
      chunkIndex: message.chunkIndex, wavBlob, durationSecs: message.durationSecs, isFinal: message.isFinal,
    };
    optionsRef.current.onChunkReady?.(event);
  }, [chunkIndexRef, optionsRef, setChunkIndex]);

  const forwardPcmToWorker = useCallback((samples: ArrayBuffer) => {
    chunkWorkerRef.current?.postMessage({ type: 'pcm', samples }, [samples]);
  }, [chunkWorkerRef]);

  const createChunkWorker = useCallback(() => createChunkWorkerInstance(
    {
      sampleRate: optionsRef.current.sampleRate ?? DEFAULT_SAMPLE_RATE,
      chunkDurationSecs: optionsRef.current.chunkDurationSecs ?? DEFAULT_CHUNK_DURATION_SECS,
      overlapSecs: optionsRef.current.overlapSecs ?? DEFAULT_OVERLAP_SECS,
    },
    {
      onChunkReady: handleChunkReady,
      onStopped: () => setState('stopped'),
      onError: (msg) => { setError(msg); setState('error'); optionsRef.current.onError?.(msg); },
      setState,
    },
  ), [handleChunkReady, optionsRef, setError, setState]);

  return { handleChunkReady, forwardPcmToWorker, createChunkWorker };
}
