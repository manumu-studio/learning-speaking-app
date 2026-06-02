// Pause, resume, stop, and reset callbacks for the AudioWorklet recording state machine
'use client';

import { useCallback } from 'react';
import { getInitialCompatState } from '@/lib/audio/audioContextCompat';
import type { AudioWorkletRecordingState } from './useAudioWorklet.types';

export interface AudioWorkletPlaybackOptions {
  state: AudioWorkletRecordingState;
  audioContextRef: React.MutableRefObject<AudioContext | null>;
  chunkWorkerRef: React.MutableRefObject<Worker | null>;
  streamRef: React.MutableRefObject<MediaStream | null>;
  timerRef: React.MutableRefObject<ReturnType<typeof setInterval> | null>;
  durationRef: React.MutableRefObject<number>;
  chunkIndexRef: React.MutableRefObject<number>;
  clearTimer: () => void;
  cleanupCapture: () => void;
  setState: React.Dispatch<React.SetStateAction<AudioWorkletRecordingState>>;
  setDuration: React.Dispatch<React.SetStateAction<number>>;
  setChunkIndex: React.Dispatch<React.SetStateAction<number>>;
  setError: React.Dispatch<React.SetStateAction<string | null>>;
  setWarnings: React.Dispatch<React.SetStateAction<string[]>>;
}

export interface AudioWorkletPlaybackReturn {
  pauseRecording: () => void;
  resumeRecording: () => void;
  stopRecording: () => Promise<void>;
  resetRecording: () => void;
}

export function useAudioWorkletPlayback({
  state,
  audioContextRef,
  chunkWorkerRef,
  streamRef,
  timerRef,
  durationRef,
  chunkIndexRef,
  clearTimer,
  cleanupCapture,
  setState,
  setDuration,
  setChunkIndex,
  setError,
  setWarnings,
}: AudioWorkletPlaybackOptions): AudioWorkletPlaybackReturn {
  const pauseRecording = useCallback(() => {
    if (state !== 'recording') { return; }
    void audioContextRef.current?.suspend();
    clearTimer();
    setState('paused');
  }, [audioContextRef, clearTimer, setState, state]);

  const resumeRecording = useCallback(() => {
    if (state !== 'paused') { return; }
    void audioContextRef.current?.resume();
    timerRef.current = setInterval(() => {
      durationRef.current += 1;
      setDuration(durationRef.current);
    }, 1000);
    setState('recording');
  }, [audioContextRef, durationRef, setDuration, setState, state, timerRef]);

  const stopRecording = useCallback(async () => {
    if (state !== 'recording' && state !== 'paused') { return; }
    if (state === 'paused') { await audioContextRef.current?.resume(); }
    setState('stopping');
    clearTimer();
    chunkWorkerRef.current?.postMessage({ type: 'stop' });
    for (const track of streamRef.current?.getAudioTracks() ?? []) { track.stop(); }
  }, [audioContextRef, chunkWorkerRef, clearTimer, setState, state, streamRef]);

  const resetRecording = useCallback(() => {
    cleanupCapture();
    setState('idle');
    setDuration(0);
    durationRef.current = 0;
    setChunkIndex(0);
    chunkIndexRef.current = 0;
    setError(null);
    setWarnings(getInitialCompatState().warnings);
  }, [chunkIndexRef, cleanupCapture, durationRef, setChunkIndex, setDuration, setError, setState, setWarnings]);

  return { pauseRecording, resumeRecording, stopRecording, resetRecording };
}
