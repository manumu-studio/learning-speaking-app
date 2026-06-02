// Wake Lock and Media Session effects for the recording panel
'use client';

import { useEffect, useRef } from 'react';
import type { RecordingStatus } from '@/features/recording/recordingState.types';

interface RecordingEffectsParams {
  recordState: RecordingStatus;
  isPaused: boolean;
  canPause: boolean;
  pauseRecording: () => void;
  resumeRecording: () => void;
}

export function useRecordingEffects({
  recordState,
  isPaused,
  canPause,
  pauseRecording,
  resumeRecording,
}: RecordingEffectsParams): void {
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);

  useEffect(() => {
    if (recordState !== 'recording' && !isPaused) {
      wakeLockRef.current?.release().catch(() => {});
      wakeLockRef.current = null;
      return;
    }
    if (recordState === 'recording' && 'wakeLock' in navigator) {
      navigator.wakeLock.request('screen').then(
        (lock) => { wakeLockRef.current = lock; },
        () => {},
      );
    }
    return () => {
      wakeLockRef.current?.release().catch(() => {});
      wakeLockRef.current = null;
    };
  }, [recordState, isPaused]);

  useEffect(() => {
    if (!('mediaSession' in navigator)) return;
    if (recordState !== 'recording' && !isPaused) return;

    navigator.mediaSession.metadata = new MediaMetadata({
      title: 'Recording workout',
      artist: 'Learning Speaking App',
    });
    navigator.mediaSession.playbackState = isPaused ? 'paused' : 'playing';

    const handlePlay = () => { if (isPaused) resumeRecording(); };
    const handlePause = () => { if (recordState === 'recording' && canPause) pauseRecording(); };

    navigator.mediaSession.setActionHandler('play', handlePlay);
    navigator.mediaSession.setActionHandler('pause', handlePause);

    return () => {
      navigator.mediaSession.setActionHandler('play', null);
      navigator.mediaSession.setActionHandler('pause', null);
      navigator.mediaSession.playbackState = 'none';
    };
  }, [recordState, isPaused, canPause, pauseRecording, resumeRecording]);
}
