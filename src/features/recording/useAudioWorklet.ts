// Orchestrates AudioWorklet PCM capture, 120s chunks with 5s overlap, and browser fallbacks
'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  attachTrackMuteHandlers,
  attachVisibilityWarning,
  connectScriptProcessorCapture,
  createAudioContext,
  detectAudioCaptureMode,
  getInitialCompatState,
  resumeAudioContext,
} from '@/lib/audio/audioContextCompat';
import type { ChunkReadyMessage } from '@/features/recording/workers/wav-chunker.worker';
import type {
  ChunkReadyEvent,
  UseAudioWorkletOptions,
  UseAudioWorkletReturn,
} from './useAudioWorklet.types';

const DEFAULT_CHUNK_DURATION_SECS = 120;
const DEFAULT_OVERLAP_SECS = 5;
const DEFAULT_SAMPLE_RATE = 16_000;

export function useAudioWorklet(
  options: UseAudioWorkletOptions = {},
): UseAudioWorkletReturn {
  const [state, setState] = useState<UseAudioWorkletReturn['state']>('idle');
  const [duration, setDuration] = useState(0);
  const [chunkIndex, setChunkIndex] = useState(0);
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>(() => getInitialCompatState().warnings);

  const captureMode = detectAudioCaptureMode();
  const optionsRef = useRef(options);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const workletNodeRef = useRef<AudioWorkletNode | null>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const chunkWorkerRef = useRef<Worker | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const cleanupHandlersRef = useRef<Array<() => void>>([]);
  const durationRef = useRef(0);
  const chunkIndexRef = useRef(0);

  useEffect(() => {
    optionsRef.current = options;
  }, [options]);

  const addWarning = useCallback((message: string) => {
    setWarnings((prev) => (prev.includes(message) ? prev : [...prev, message]));
  }, []);

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const cleanupCapture = useCallback(() => {
    clearTimer();

    for (const cleanup of cleanupHandlersRef.current) {
      cleanup();
    }
    cleanupHandlersRef.current = [];

    workletNodeRef.current?.disconnect();
    workletNodeRef.current = null;

    scriptProcessorRef.current?.disconnect();
    scriptProcessorRef.current = null;

    sourceNodeRef.current?.disconnect();
    sourceNodeRef.current = null;

    const worker = chunkWorkerRef.current;
    chunkWorkerRef.current = null;
    worker?.terminate();

    const stream = streamRef.current;
    streamRef.current = null;
    if (stream) {
      for (const track of stream.getTracks()) {
        track.stop();
      }
    }
    setMediaStream(null);

    const audioContext = audioContextRef.current;
    audioContextRef.current = null;
    if (audioContext && audioContext.state !== 'closed') {
      void audioContext.close();
    }
  }, [clearTimer]);

  const handleChunkReady = useCallback((message: ChunkReadyMessage) => {
    const wavBlob = new Blob([message.wavBuffer], { type: 'audio/wav' });
    chunkIndexRef.current = message.chunkIndex + 1;
    setChunkIndex(message.chunkIndex + 1);

    const event: ChunkReadyEvent = {
      chunkIndex: message.chunkIndex,
      wavBlob,
      durationSecs: message.durationSecs,
      isFinal: message.isFinal,
    };

    optionsRef.current.onChunkReady?.(event);
  }, []);

  const createChunkWorker = useCallback((): Worker => {
    const worker = new Worker(
      new URL('./workers/wav-chunker.worker.ts', import.meta.url),
      { type: 'module' },
    );

    worker.onmessage = (event: MessageEvent<ChunkReadyMessage | { type: 'error'; message: string }>) => {
      const message = event.data;
      if (message.type === 'chunk-ready') {
        handleChunkReady(message);
        if (message.isFinal) {
          setState('stopped');
        }
        return;
      }

      const errorMessage = message.message;
      setError(errorMessage);
      setState('error');
      optionsRef.current.onError?.(errorMessage);
    };

    worker.onerror = () => {
      const errorMessage = 'Chunk worker failed unexpectedly';
      setError(errorMessage);
      setState('error');
      optionsRef.current.onError?.(errorMessage);
    };

    worker.postMessage({
      type: 'configure',
      sampleRate: optionsRef.current.sampleRate ?? DEFAULT_SAMPLE_RATE,
      chunkDurationSecs: optionsRef.current.chunkDurationSecs ?? DEFAULT_CHUNK_DURATION_SECS,
      overlapSecs: optionsRef.current.overlapSecs ?? DEFAULT_OVERLAP_SECS,
    });

    return worker;
  }, [handleChunkReady]);

  const forwardPcmToWorker = useCallback((samples: ArrayBuffer) => {
    chunkWorkerRef.current?.postMessage({ type: 'pcm', samples }, [samples]);
  }, []);

  const startRecording = useCallback(async () => {
    if (state !== 'idle' && state !== 'stopped' && state !== 'error') {
      return;
    }

    if (captureMode === 'unsupported') {
      const errorMessage = 'This browser does not support continuous audio capture';
      setError(errorMessage);
      setState('error');
      optionsRef.current.onError?.(errorMessage);
      return;
    }

    try {
      setError(null);
      setState('recording');
      setDuration(0);
      durationRef.current = 0;
      setChunkIndex(0);
      chunkIndexRef.current = 0;
      cleanupCapture();

      const sampleRate = optionsRef.current.sampleRate ?? DEFAULT_SAMPLE_RATE;
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate,
          channelCount: 1,
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
      });

      streamRef.current = stream;
      setMediaStream(stream);

      const audioContext = await createAudioContext(sampleRate);
      audioContextRef.current = audioContext;
      await resumeAudioContext(audioContext);

      const source = audioContext.createMediaStreamSource(stream);
      sourceNodeRef.current = source;

      chunkWorkerRef.current = createChunkWorker();

      if (captureMode === 'audioworklet') {
        await audioContext.audioWorklet.addModule('/worklets/pcm-collector.worklet.js');
        const workletNode = new AudioWorkletNode(audioContext, 'pcm-collector');
        workletNode.port.onmessage = (event: MessageEvent<{ type: string; samples: ArrayBuffer }>) => {
          if (event.data.type === 'pcm') {
            forwardPcmToWorker(event.data.samples);
          }
        };
        source.connect(workletNode);
        workletNode.connect(audioContext.destination);
        workletNodeRef.current = workletNode;
      } else {
        scriptProcessorRef.current = connectScriptProcessorCapture(
          audioContext,
          source,
          forwardPcmToWorker,
        );
      }

      cleanupHandlersRef.current.push(
        attachVisibilityWarning(audioContext, addWarning),
        attachTrackMuteHandlers(stream, addWarning),
      );

      timerRef.current = setInterval(() => {
        durationRef.current += 1;
        setDuration(durationRef.current);
      }, 1000);
    } catch (err) {
      cleanupCapture();
      const errorMessage = err instanceof Error ? err.message : 'Failed to start recording';
      setError(errorMessage);
      setState('error');
      optionsRef.current.onError?.(errorMessage);
    }
  }, [
    addWarning,
    captureMode,
    cleanupCapture,
    createChunkWorker,
    forwardPcmToWorker,
    state,
  ]);

  const stopRecording = useCallback(async () => {
    if (state !== 'recording') {
      return;
    }

    setState('stopping');
    clearTimer();
    chunkWorkerRef.current?.postMessage({ type: 'stop' });

    for (const track of streamRef.current?.getAudioTracks() ?? []) {
      track.stop();
    }
  }, [clearTimer, state]);

  const resetRecording = useCallback(() => {
    cleanupCapture();
    setState('idle');
    setDuration(0);
    durationRef.current = 0;
    setChunkIndex(0);
    chunkIndexRef.current = 0;
    setError(null);
    setWarnings(getInitialCompatState().warnings);
  }, [cleanupCapture]);

  useEffect(() => () => {
    cleanupCapture();
  }, [cleanupCapture]);

  return {
    state,
    duration,
    chunkIndex,
    mediaStream,
    captureMode,
    error,
    warnings,
    startRecording,
    stopRecording,
    resetRecording,
  };
}
