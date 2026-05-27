// Wake Lock, haptic feedback, and mic interruption handling during recording
'use client';

import { useCallback, useEffect, useRef } from 'react';
import type {
  UseMobileRecordingOptions,
  UseMobileRecordingReturn,
} from './useMobileRecording.types';

function pulseVibrate(pattern: number | number[]): void {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    navigator.vibrate(pattern);
  }
}

export function useMobileRecording({
  isRecording,
  mediaStream,
  startRecording,
  stopRecording,
  onInterrupted,
}: UseMobileRecordingOptions): UseMobileRecordingReturn {
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);
  const isRecordingRef = useRef(isRecording);

  useEffect(() => {
    isRecordingRef.current = isRecording;
  }, [isRecording]);

  const releaseWakeLock = useCallback(async () => {
    const lock = wakeLockRef.current;
    wakeLockRef.current = null;
    if (!lock) return;
    try {
      await lock.release();
    } catch {
      // Wake lock may already be released by the browser
    }
  }, []);

  const acquireWakeLock = useCallback(async () => {
    if (typeof navigator === 'undefined' || !('wakeLock' in navigator)) {
      return;
    }
    try {
      wakeLockRef.current = await navigator.wakeLock.request('screen');
    } catch {
      // Permission denied or unsupported — recording still works
    }
  }, []);

  useEffect(() => {
    if (!isRecording) {
      void releaseWakeLock();
    }
  }, [isRecording, releaseWakeLock]);

  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && isRecordingRef.current) {
        void acquireWakeLock();
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [acquireWakeLock]);

  useEffect(() => {
    if (!isRecording || !mediaStream) {
      return undefined;
    }

    const tracks = mediaStream.getAudioTracks();
    const handleEnded = () => {
      if (!isRecordingRef.current) return;
      stopRecording();
      onInterrupted(
        'Recording was interrupted. Your microphone stopped unexpectedly.',
      );
    };

    tracks.forEach((track) => track.addEventListener('ended', handleEnded));
    return () => {
      tracks.forEach((track) => track.removeEventListener('ended', handleEnded));
    };
  }, [isRecording, mediaStream, stopRecording, onInterrupted]);

  const startWithMobilePolish = useCallback(async () => {
    await acquireWakeLock();
    pulseVibrate(50);
    await startRecording();
  }, [acquireWakeLock, startRecording]);

  const stopWithMobilePolish = useCallback(() => {
    stopRecording();
    pulseVibrate([100, 50]);
    void releaseWakeLock();
  }, [stopRecording, releaseWakeLock]);

  return { startWithMobilePolish, stopWithMobilePolish };
}
