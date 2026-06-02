// Orchestrates AudioWorklet PCM capture, 120s chunks with 5s overlap, and browser fallbacks
'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { detectAudioCaptureMode, getInitialCompatState } from '@/lib/audio/audioContextCompat';
import {
  executeStartRecording,
  runCleanupCapture,
  DEFAULT_SAMPLE_RATE,
} from './useAudioWorkletHelpers';
import { useAudioWorkletChunk } from './useAudioWorkletChunk';
import { useAudioWorkletPlayback } from './useAudioWorkletPlayback';
import type { UseAudioWorkletOptions, UseAudioWorkletReturn } from './useAudioWorklet.types';

export function useAudioWorklet(options: UseAudioWorkletOptions = {}): UseAudioWorkletReturn {
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

  useEffect(() => { optionsRef.current = options; }, [options]);

  const addWarning = useCallback((message: string) => {
    setWarnings((prev) => (prev.includes(message) ? prev : [...prev, message]));
  }, []);

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) { clearInterval(timerRef.current); timerRef.current = null; }
  }, []);

  const cleanupCapture = useCallback(() => {
    runCleanupCapture(
      { timerRef, cleanupHandlersRef, workletNodeRef, scriptProcessorRef, sourceNodeRef, chunkWorkerRef, streamRef, audioContextRef },
      clearTimer,
      setMediaStream,
    );
  }, [clearTimer]);

  const { forwardPcmToWorker, createChunkWorker } = useAudioWorkletChunk({
    chunkWorkerRef, chunkIndexRef, optionsRef, setState, setChunkIndex, setError,
  });

  const startRecording = useCallback(async () => {
    if (state !== 'idle' && state !== 'stopped' && state !== 'error') { return; }
    if (captureMode === 'unsupported') {
      const msg = 'This browser does not support continuous audio capture';
      setError(msg); setState('error'); optionsRef.current.onError?.(msg);
      return;
    }
    try {
      setError(null); setState('recording');
      setDuration(0); durationRef.current = 0;
      setChunkIndex(0); chunkIndexRef.current = 0;
      cleanupCapture();
      await executeStartRecording(
        { streamRef, audioContextRef, workletNodeRef, scriptProcessorRef, sourceNodeRef, chunkWorkerRef, timerRef, cleanupHandlersRef, durationRef },
        { captureMode, sampleRate: optionsRef.current.sampleRate ?? DEFAULT_SAMPLE_RATE, createWorker: createChunkWorker, forwardPcm: forwardPcmToWorker, addWarning, setMediaStream, setDuration },
      );
    } catch (err) {
      cleanupCapture();
      const msg = err instanceof Error ? err.message : 'Failed to start recording';
      setError(msg); setState('error'); optionsRef.current.onError?.(msg);
    }
  }, [addWarning, captureMode, cleanupCapture, createChunkWorker, forwardPcmToWorker, state]);

  const { pauseRecording, resumeRecording, stopRecording, resetRecording } = useAudioWorkletPlayback({
    state, audioContextRef, chunkWorkerRef, streamRef, timerRef, durationRef, chunkIndexRef,
    clearTimer, cleanupCapture, setState, setDuration, setChunkIndex, setError, setWarnings,
  });

  useEffect(() => () => { cleanupCapture(); }, [cleanupCapture]);

  return { state, duration, chunkIndex, mediaStream, captureMode, error, warnings, startRecording, stopRecording, pauseRecording, resumeRecording, resetRecording };
}
