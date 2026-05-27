// Simplified recording panel for the onboarding placement test
'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAudioRecorder } from '@/features/recording/useAudioRecorder';
import { useSileroVad } from '@/features/recording/useSileroVad';
import { useSilenceDetector } from '@/features/recording/useSilenceDetector';
import { useMobileRecording } from '@/features/recording/useMobileRecording';
import { validateRecording } from '@/features/recording/validateRecording';
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

export function OnboardingRecorder({ onComplete }: OnboardingRecorderProps) {
  const validationRunRef = useRef<string | null>(null);
  const [mobileError, setMobileError] = useState<string | null>(null);
  const [isPausedBySilence, setIsPausedBySilence] = useState(false);

  const { addSession } = useProcessingSessions();
  const { upload, isUploading, error: uploadError } = useOnboardingRecorder();

  const {
    state,
    duration,
    audioBlob,
    mimeType,
    mediaStream,
    vadWarning,
    error: recordError,
    startRecording,
    stopRecording,
    completeValidation,
    failValidation,
    resetRecording,
    timeLimitSecs,
  } = useAudioRecorder({
    recordingMode: 'press-to-toggle',
    maxDurationSecs: MAX_DURATION_SECS,
    timeLimitSecs: MAX_DURATION_SECS,
    isPaused: isPausedBySilence,
    warningBeforeSplitSecs: 15,
  });

  const { isPausedBySilence: detectedSilence } = useSilenceDetector({
    stream: mediaStream,
    isRecording: state === 'recording',
  });

  useEffect(() => {
    setIsPausedBySilence(detectedSilence);
  }, [detectedSilence]);

  const { startWithMobilePolish, stopWithMobilePolish } = useMobileRecording({
    isRecording: state === 'recording',
    mediaStream,
    startRecording,
    stopRecording,
    onInterrupted: setMobileError,
  });

  const { status: vadStatus, analyzeBlob, reset: resetVad } = useSileroVad();
  const isAnalyzing = vadStatus === 'loading' || vadStatus === 'running';
  const error = recordError ?? uploadError ?? mobileError;

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
    if (state !== 'validating' || !audioBlob || !mimeType) return;

    const runKey = `${audioBlob.size}-${duration}`;
    if (validationRunRef.current === runKey) return;
    validationRunRef.current = runKey;

    const runValidation = async () => {
      if (duration < MIN_DURATION_SECS) {
        failValidation(
          `Please speak for at least ${MIN_DURATION_SECS} seconds so we can build your voice profile.`,
        );
        return;
      }

      const validation = validateRecording({ durationSeconds: duration, blob: audioBlob, mimeType });
      if (!validation.valid) {
        failValidation(validation.message);
        return;
      }

      const vadResult = await analyzeBlob(audioBlob);
      if (vadResult.outcome === 'no-speech') {
        failValidation(vadResult.message);
        return;
      }
      if (vadResult.outcome === 'error') {
        completeValidation(null);
        return;
      }
      if (vadResult.outcome === 'multi-voice') {
        completeValidation({ message: vadResult.message, canProceed: true });
        return;
      }
      completeValidation(null);
    };

    void runValidation();
  }, [state, audioBlob, mimeType, duration, analyzeBlob, completeValidation, failValidation]);

  const resetSession = useCallback(() => {
    resetRecording();
    resetVad();
    validationRunRef.current = null;
    setMobileError(null);
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
        {state === 'recording' && (
          <AudioLevelMeter stream={mediaStream} isActive={state === 'recording'} />
        )}
        <SessionTimer
          seconds={duration}
          isActive={state === 'recording'}
          limitSecs={timeLimitSecs ?? MAX_DURATION_SECS}
        />
      </div>

      <div className="flex w-full flex-col items-center gap-4 sm:flex-row sm:justify-center">
        <WaveformVisualizer stream={mediaStream} />
        <RecordButton
          state={state}
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
        {!error && state === 'idle' && (
          <p className="text-gray-500 dark:text-gray-400">Press the button to start</p>
        )}
        {!error && state === 'recording' && !isPausedBySilence && (
          <p className="font-medium text-gray-700 dark:text-gray-200">Recording…</p>
        )}
        {!error && state === 'recording' && isPausedBySilence && (
          <p className="text-amber-700 dark:text-amber-300">Paused — waiting for speech</p>
        )}
        {!error && state === 'validating' && (
          <p className="text-blue-600 dark:text-blue-400">Checking recording…</p>
        )}
        {isUploading && state === 'stopped' && (
          <p className="text-blue-600 dark:text-blue-400">Uploading…</p>
        )}
      </div>

      {audioPreviewUrl && state === 'stopped' && (
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
