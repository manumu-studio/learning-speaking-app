// Hook managing audio capture, silence detection, mobile polishing, and UI-state sync for onboarding recorder
'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useAudioWorklet } from '@/features/recording/useAudioWorklet';
import type { ChunkReadyEvent } from '@/features/recording/useAudioWorklet.types';
import { useSilenceDetector } from '@/features/recording/useSilenceDetector';
import { useMobileRecording } from '@/features/recording/useMobileRecording';
import type { RecordingStatus } from '@/features/recording/recordingState.types';

const MAX_DURATION_SECS = 60;

export interface RecorderCaptureResult {
  captureState: string;
  duration: number;
  mediaStream: MediaStream | null;
  captureError: string | null;
  audioBlob: Blob | null;
  uiState: RecordingStatus;
  isPausedBySilence: boolean;
  mobileError: string | null;
  validationRunRef: React.MutableRefObject<string | null>;
  setAudioBlob: (b: Blob | null) => void;
  setUiState: (s: RecordingStatus) => void;
  startWithMobilePolish: () => void;
  stopWithMobilePolish: () => void;
  stopRecording: () => Promise<void>;
  resetRecording: () => void;
}

export interface RecorderCaptureOptions {
  /** Called before each new recording starts — use to clear validation/vad state */
  onBeforeStart?: () => void;
}

export function useRecorderCapture(options?: RecorderCaptureOptions): RecorderCaptureResult {
  const validationRunRef = useRef<string | null>(null);
  const [mobileError, setMobileError] = useState<string | null>(null);
  const [isPausedBySilence, setIsPausedBySilence] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [uiState, setUiState] = useState<RecordingStatus>('idle');

  const handleChunkReady = useCallback((event: ChunkReadyEvent) => {
    if (event.isFinal) setAudioBlob(event.wavBlob);
  }, []);

  const {
    state: captureState,
    duration,
    mediaStream,
    error: captureError,
    startRecording,
    stopRecording,
    resetRecording,
  } = useAudioWorklet({ onChunkReady: handleChunkReady, chunkDurationSecs: MAX_DURATION_SECS });

  const { isPausedBySilence: detectedSilence } = useSilenceDetector({
    stream: mediaStream,
    isRecording: captureState === 'recording',
  });

  useEffect(() => { setIsPausedBySilence(detectedSilence); }, [detectedSilence]);

  useEffect(() => {
    if (captureState === 'recording' || captureState === 'stopping') {
      setUiState('recording');
      return;
    }
    if (captureState === 'stopped' && audioBlob && uiState !== 'stopped') {
      setUiState('validating');
      return;
    }
    if (captureState === 'idle' || captureState === 'error') setUiState('idle');
  }, [captureState, audioBlob, uiState]);

  useEffect(() => {
    if (captureState === 'recording' && duration >= MAX_DURATION_SECS) void stopRecording();
  }, [captureState, duration, stopRecording]);

  const { startWithMobilePolish, stopWithMobilePolish } = useMobileRecording({
    isRecording: captureState === 'recording',
    mediaStream,
    startRecording: () => {
      setAudioBlob(null);
      validationRunRef.current = null;
      options?.onBeforeStart?.();
      return startRecording();
    },
    stopRecording: () => { void stopRecording(); },
    onInterrupted: setMobileError,
  });

  return {
    captureState,
    duration,
    mediaStream,
    captureError,
    audioBlob,
    uiState,
    isPausedBySilence,
    mobileError,
    validationRunRef,
    setAudioBlob,
    setUiState,
    startWithMobilePolish,
    stopWithMobilePolish,
    stopRecording,
    resetRecording,
  };
}
