// Simplified recording panel for the onboarding placement test
'use client';
/* eslint-disable complexity, max-lines-per-function */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAudioWorklet } from '@/features/recording/useAudioWorklet';
import type { ChunkReadyEvent } from '@/features/recording/useAudioWorklet.types';
import { useSileroVad } from '@/features/recording/useSileroVad';
import { useSilenceDetector } from '@/features/recording/useSilenceDetector';
import { useMobileRecording } from '@/features/recording/useMobileRecording';
import { validateRecording } from '@/features/recording/validateRecording';
import type { RecordingStatus } from '@/features/recording/recordingState.types';
import type { VadPreflightWarning } from '@/features/recording/recordingState.types';
import { RecordButton } from '@/components/ui/RecordButton';
import { SessionTimer } from '@/components/ui/SessionTimer';
import { AudioLevelMeter } from '@/components/ui/AudioLevelMeter';
import { WaveformVisualizer } from '@/features/recording/WaveformVisualizer';
import { AudioPreviewPanel } from '@/features/recording/AudioPreviewPanel';
import { useProcessingSessions } from '@/features/session/ProcessingSessionsContext';
import { useOnboardingRecorder } from './useOnboardingRecorder';
import type { OnboardingRecorderProps } from './OnboardingRecorder.types';

const MAX_DURATION_SECS = 60;
const MIN_DURATION_SECS = 30;
const WAV_MIME = 'audio/wav';

export function OnboardingRecorder({ onComplete }: OnboardingRecorderProps) {
  const validationRunRef = useRef<string | null>(null);
  const [mobileError, setMobileError] = useState<string | null>(null);
  const [isPausedBySilence, setIsPausedBySilence] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [uiState, setUiState] = useState<RecordingStatus>('idle');
  const [vadWarning, setVadWarning] = useState<VadPreflightWarning | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  const { addSession } = useProcessingSessions();
  const { upload, isUploading, error: uploadError } = useOnboardingRecorder();

  const handleChunkReady = useCallback((event: ChunkReadyEvent) => {
    if (event.isFinal) {
      setAudioBlob(event.wavBlob);
    }
  }, []);

  const {
    state: captureState,
    duration,
    mediaStream,
    error: captureError,
    startRecording,
    stopRecording,
    resetRecording,
  } = useAudioWorklet({
    onChunkReady: handleChunkReady,
    chunkDurationSecs: MAX_DURATION_SECS,
  });

  const { isPausedBySilence: detectedSilence } = useSilenceDetector({
    stream: mediaStream,
    isRecording: captureState === 'recording',
  });

  useEffect(() => {
    setIsPausedBySilence(detectedSilence);
  }, [detectedSilence]);

  useEffect(() => {
    if (captureState === 'recording' || captureState === 'stopping') {
      setUiState('recording');
      return;
    }
    if (captureState === 'stopped' && audioBlob && uiState !== 'stopped') {
      setUiState('validating');
      return;
    }
    if (captureState === 'idle' || captureState === 'error') {
      setUiState('idle');
    }
  }, [captureState, audioBlob, uiState]);

  useEffect(() => {
    if (captureState === 'recording' && duration >= MAX_DURATION_SECS) {
      void stopRecording();
    }
  }, [captureState, duration, stopRecording]);

  const { startWithMobilePolish, stopWithMobilePolish } = useMobileRecording({
    isRecording: captureState === 'recording',
    mediaStream,
    startRecording: () => {
      setAudioBlob(null);
      setValidationError(null);
      setVadWarning(null);
      validationRunRef.current = null;
      return startRecording();
    },
    stopRecording: () => {
      void stopRecording();
    },
    onInterrupted: setMobileError,
  });

  const { status: vadStatus, analyzeBlob, reset: resetVad } = useSileroVad();
  const isAnalyzing = vadStatus === 'loading' || vadStatus === 'running';
  const error = captureError ?? uploadError ?? mobileError ?? validationError;

  const audioPreviewUrl = useMemo(() => {
    if (audioBlob) return URL.createObjectURL(audioBlob);
    return null;
  }, [audioBlob]);

  useEffect(() => {
    return () => {
      if (audioPreviewUrl) URL.revokeObjectURL(audioPreviewUrl);
    };
  }, [audioPreviewUrl]);

  useEffect(() => {
    if (uiState !== 'validating' || !audioBlob) return;

    const runKey = `${audioBlob.size}-${duration}`;
    if (validationRunRef.current === runKey) return;
    validationRunRef.current = runKey;

    const runValidation = async () => {
      if (duration < MIN_DURATION_SECS) {
        setValidationError(
          `Please speak for at least ${MIN_DURATION_SECS} seconds so we can build your voice profile.`,
        );
        resetRecording();
        setAudioBlob(null);
        setUiState('idle');
        return;
      }

      const validation = validateRecording({
        durationSeconds: duration,
        blob: audioBlob,
        mimeType: WAV_MIME,
      });
      if (!validation.valid) {
        setValidationError(validation.message);
        resetRecording();
        setAudioBlob(null);
        setUiState('idle');
        return;
      }

      const vadResult = await analyzeBlob(audioBlob);
      if (vadResult.outcome === 'no-speech') {
        setValidationError(vadResult.message);
        resetRecording();
        setAudioBlob(null);
        setUiState('idle');
        return;
      }
      if (vadResult.outcome === 'error') {
        setVadWarning(null);
        setUiState('stopped');
        return;
      }
      if (vadResult.outcome === 'multi-voice') {
        setVadWarning({ message: vadResult.message, canProceed: true });
        setUiState('stopped');
        return;
      }
      setVadWarning(null);
      setUiState('stopped');
    };

    void runValidation();
  }, [uiState, audioBlob, duration, analyzeBlob, resetRecording]);

  const resetSession = useCallback(() => {
    resetRecording();
    resetVad();
    validationRunRef.current = null;
    setMobileError(null);
    setAudioBlob(null);
    setValidationError(null);
    setVadWarning(null);
    setUiState('idle');
  }, [resetRecording, resetVad]);

  const handleUpload = async () => {
    if (!audioBlob) return;
    try {
      const newSessionId = await upload(audioBlob, duration);
      addSession(newSessionId);
      resetSession();
      onComplete(newSessionId);
    } catch {
      // error shown via uploadError state
    }
  };

  return (
    <div className="flex flex-col items-center gap-6 w-full">
      <div className="w-full rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 px-4 py-3 text-sm text-gray-500 dark:text-gray-400 text-center">
        Speak for <span className="font-semibold text-gray-700 dark:text-gray-200">30–60 seconds</span>. The timer stops automatically at 60s.
      </div>

      <div className="flex items-end justify-center gap-4 w-full">
        {uiState === 'recording' && (
          <AudioLevelMeter stream={mediaStream} isActive={uiState === 'recording'} />
        )}
        <SessionTimer
          seconds={duration}
          isActive={uiState === 'recording'}
          limitSecs={MAX_DURATION_SECS}
        />
      </div>

      <div className="flex w-full flex-col items-center gap-4 sm:flex-row sm:justify-center">
        <WaveformVisualizer stream={mediaStream} />
        <RecordButton
          state={uiState}
          recordingMode="press-to-toggle"
          onStart={startWithMobilePolish}
          onStop={stopWithMobilePolish}
          disabled={isUploading || isAnalyzing}
        />
      </div>

      <div className="text-center min-h-[48px] w-full" aria-live="polite" role="status">
        {error && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/50 p-4">
            <p className="text-sm text-amber-800 dark:text-amber-300">{error}</p>
          </div>
        )}
        {!error && uiState === 'idle' && (
          <p className="text-gray-500 dark:text-gray-400">Press the button to start</p>
        )}
        {!error && uiState === 'recording' && !isPausedBySilence && (
          <p className="font-medium text-gray-700 dark:text-gray-200">Recording…</p>
        )}
        {!error && uiState === 'recording' && isPausedBySilence && (
          <p className="text-amber-700 dark:text-amber-300">Paused — waiting for speech</p>
        )}
        {!error && uiState === 'validating' && (
          <p className="text-blue-600 dark:text-blue-400">Checking recording…</p>
        )}
        {isUploading && uiState === 'stopped' && (
          <p className="text-blue-600 dark:text-blue-400">Uploading…</p>
        )}
      </div>

      {audioPreviewUrl && uiState === 'stopped' && (
        <AudioPreviewPanel
          audioPreviewUrl={audioPreviewUrl}
          vadWarning={vadWarning}
          isUploading={isUploading}
          onSubmit={() => void handleUpload()}
          onTryAgain={resetSession}
          onDiscard={resetSession}
        />
      )}
    </div>
  );
}
