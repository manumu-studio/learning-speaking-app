// Hook encapsulating VAD, validation, upload, and preview logic for OnboardingRecorder
'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSileroVad } from '@/features/recording/useSileroVad';
import { validateRecording } from '@/features/recording/validateRecording';
import type { VadPreflightWarning, RecordingStatus } from '@/features/recording/recordingState.types';
import type { VadPreflightResult } from '@/features/recording/useSileroVad.types';
import { useProcessingSessions } from '@/features/session/ProcessingSessionsContext';
import { useOnboardingRecorder } from './useOnboardingRecorder';
import { useRecorderCapture } from './useRecorderCapture';
import type { OnboardingRecorderState } from './useOnboardingRecorderState.types';

export type { OnboardingRecorderState };

const MIN_DURATION_SECS = 30;
const WAV_MIME = 'audio/wav';

interface ValidationContext {
  blob: Blob;
  duration: number;
  analyzeBlob: (b: Blob) => Promise<VadPreflightResult>;
  onReset: () => void;
  setValidationError: (m: string) => void;
  setVadWarning: (w: VadPreflightWarning | null) => void;
  setAudioBlob: (b: Blob | null) => void;
  setUiState: (s: RecordingStatus) => void;
}

async function runValidation({
  blob, duration, analyzeBlob, onReset,
  setValidationError, setVadWarning, setAudioBlob, setUiState,
}: ValidationContext): Promise<void> {
  if (duration < MIN_DURATION_SECS) {
    setValidationError(
      `Please speak for at least ${MIN_DURATION_SECS} seconds so we can build your voice profile.`,
    );
    onReset();
    setAudioBlob(null);
    setUiState('idle');
    return;
  }
  const validation = validateRecording({ durationSeconds: duration, blob, mimeType: WAV_MIME });
  if (!validation.valid) {
    setValidationError(validation.message);
    onReset();
    setAudioBlob(null);
    setUiState('idle');
    return;
  }
  const vadResult = await analyzeBlob(blob);
  if (vadResult.outcome === 'no-speech') {
    setValidationError(vadResult.message);
    onReset();
    setAudioBlob(null);
    setUiState('idle');
    return;
  }
  if (vadResult.outcome === 'multi-voice') {
    setVadWarning({ message: vadResult.message, canProceed: true });
  } else {
    setVadWarning(null);
  }
  setUiState('stopped');
}

export function useOnboardingRecorderState(
  onComplete: (sessionId: string) => void,
): OnboardingRecorderState {
  const [vadWarning, setVadWarning] = useState<VadPreflightWarning | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  const { addSession } = useProcessingSessions();
  const { upload, isUploading, error: uploadError } = useOnboardingRecorder();
  const { status: vadStatus, analyzeBlob, reset: resetVad } = useSileroVad();

  const capture = useRecorderCapture({
    onBeforeStart: () => {
      setValidationError(null);
      setVadWarning(null);
    },
  });

  const {
    captureError, mobileError, audioBlob, uiState, isPausedBySilence,
    duration, mediaStream, validationRunRef,
    setAudioBlob, setUiState, startWithMobilePolish, stopWithMobilePolish, resetRecording,
  } = capture;

  const isAnalyzing = vadStatus === 'loading' || vadStatus === 'running';
  const error = captureError ?? uploadError ?? mobileError ?? validationError;

  const audioPreviewUrl = useMemo(() => {
    if (audioBlob) return URL.createObjectURL(audioBlob);
    return null;
  }, [audioBlob]);

  useEffect(() => {
    return () => { if (audioPreviewUrl) URL.revokeObjectURL(audioPreviewUrl); };
  }, [audioPreviewUrl]);

  useEffect(() => {
    if (uiState !== 'validating' || !audioBlob) return;
    const runKey = `${audioBlob.size}-${duration}`;
    if (validationRunRef.current === runKey) return;
    validationRunRef.current = runKey;
    void runValidation({
      blob: audioBlob, duration, analyzeBlob, onReset: resetRecording,
      setValidationError, setVadWarning, setAudioBlob, setUiState,
    });
  }, [uiState, audioBlob, duration, analyzeBlob, resetRecording, validationRunRef, setAudioBlob, setUiState]);

  const resetSession = useCallback(() => {
    resetRecording();
    resetVad();
    validationRunRef.current = null;
    setAudioBlob(null);
    setValidationError(null);
    setVadWarning(null);
    setUiState('idle');
  }, [resetRecording, resetVad, validationRunRef, setAudioBlob, setUiState]);

  const handleUpload = useCallback(async () => {
    if (!audioBlob) return;
    try {
      const newSessionId = await upload(audioBlob, duration);
      addSession(newSessionId);
      resetSession();
      onComplete(newSessionId);
    } catch {
      // error surfaced via uploadError state
    }
  }, [audioBlob, upload, duration, addSession, resetSession, onComplete]);

  return {
    uiState, duration, mediaStream, audioPreviewUrl, vadWarning,
    isPausedBySilence, isUploading, isAnalyzing, error,
    startWithMobilePolish, stopWithMobilePolish,
    handleUpload: () => void handleUpload(),
    resetSession,
  };
}
