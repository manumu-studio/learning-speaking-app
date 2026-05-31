// Orchestrates chunked AudioWorklet recording, parallel upload, and session completion
'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAudioWorklet } from '@/features/recording/useAudioWorklet';
import { useChunkUploader } from '@/features/recording/useChunkUploader';
import { useMobileRecording } from '@/features/recording/useMobileRecording';
import { useSilenceDetector } from '@/features/recording/useSilenceDetector';
import { useProcessingSessions } from '@/features/session/ProcessingSessionsContext';
import type { RecordingStatus } from '@/features/recording/recordingState.types';
import type { RecordingPanelProps } from './RecordingPanel.types';

const TIER_1_MAX_SECS = 45;
const TIER_2_MAX_SECS = 120;

type CancelTier = 'silent' | 'prompt' | 'modal';

function mapRecordingState(
  state: 'idle' | 'recording' | 'stopping' | 'stopped' | 'error',
): RecordingStatus {
  if (state === 'recording' || state === 'stopping') {
    return 'recording';
  }
  if (state === 'stopped') {
    return 'stopped';
  }
  return 'idle';
}

function getCancelTier(durationSecs: number): CancelTier {
  if (durationSecs < TIER_1_MAX_SECS) {
    return 'silent';
  }
  if (durationSecs < TIER_2_MAX_SECS) {
    return 'prompt';
  }
  return 'modal';
}

export function useRecordingPanel({
  topic,
  focus,
  recordingMode = 'press-to-toggle',
  promptUsed = null,
}: RecordingPanelProps) {
  const router = useRouter();
  const [mobileError, setMobileError] = useState<string | null>(null);
  const [isCompleting, setIsCompleting] = useState(false);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const { addSession } = useProcessingSessions();

  const {
    chunks,
    sessionId,
    uploadChunkIndependent,
    completeSession,
    isUploading,
    error: uploadError,
    resetUploader,
    abortAllUploads,
    waitForInFlightUploads,
  } = useChunkUploader({
    topic,
    focus,
    promptUsed,
  });

  const handleChunkReady = useCallback(
    (event: Parameters<typeof uploadChunkIndependent>[0]) => {
      uploadChunkIndependent(event);
    },
    [uploadChunkIndependent],
  );

  const {
    state: captureState,
    duration,
    chunkIndex,
    mediaStream,
    error: captureError,
    warnings,
    startRecording,
    stopRecording,
    resetRecording,
  } = useAudioWorklet({ onChunkReady: handleChunkReady });

  const recordState = mapRecordingState(captureState);
  const cancelTier = getCancelTier(duration);
  const hasCompletedChunks = chunks.some((chunk) => chunk.status === 'completed');

  const { isPausedBySilence } = useSilenceDetector({
    stream: mediaStream,
    isRecording: recordState === 'recording',
  });

  const { startWithMobilePolish, stopWithMobilePolish } = useMobileRecording({
    isRecording: recordState === 'recording',
    mediaStream,
    startRecording: () => startRecording(),
    stopRecording: () => {
      void stopRecording();
    },
    onInterrupted: setMobileError,
  });

  const handleCancelPress = useCallback(async () => {
    const tier = getCancelTier(duration);

    if (tier === 'silent') {
      abortAllUploads();
      await stopRecording();
      resetRecording();
      resetUploader();
      router.push('/');
      return;
    }

    setIsCancelModalOpen(true);
  }, [abortAllUploads, duration, resetRecording, resetUploader, router, stopRecording]);

  const handleCancelModalDismiss = useCallback(() => {
    setIsCancelModalOpen(false);
  }, []);

  const handleDiscardSession = useCallback(async () => {
    abortAllUploads();

    if (recordState === 'recording') {
      await stopRecording();
    }

    const currentSessionId = sessionId;

    if (currentSessionId) {
      try {
        await fetch('/api/internal/cancel-session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId: currentSessionId }),
        });
      } catch {
        // Non-fatal — user is navigating away regardless
      }
    }

    resetRecording();
    resetUploader();
    setIsCancelModalOpen(false);
    router.push('/');
  }, [
    abortAllUploads,
    recordState,
    stopRecording,
    sessionId,
    resetRecording,
    resetUploader,
    router,
  ]);

  const handleFinishEarly = useCallback(async () => {
    if (recordState === 'recording') {
      await stopRecording();
    }

    setIsCancelModalOpen(false);
    await waitForInFlightUploads();

    setIsCompleting(true);
    const completedSessionId = await completeSession(duration);

    if (!completedSessionId) {
      setIsCompleting(false);
      return;
    }

    addSession(completedSessionId);
    router.push(`/session/${completedSessionId}`);
  }, [
    addSession,
    completeSession,
    duration,
    recordState,
    router,
    stopRecording,
    waitForInFlightUploads,
  ]);

  useEffect(() => {
    if (captureState !== 'stopped' || isCompleting) {
      return;
    }

    const finalize = async () => {
      setIsCompleting(true);
      const completedId = await completeSession(duration);
      if (completedId) {
        addSession(completedId);
        router.push(`/session/${completedId}`);
        return;
      }
      setIsCompleting(false);
    };

    void finalize();
  }, [addSession, captureState, completeSession, duration, isCompleting, router]);

  const resetSession = useCallback(() => {
    resetRecording();
    resetUploader();
    setMobileError(null);
    setIsCompleting(false);
    setIsCancelModalOpen(false);
  }, [resetRecording, resetUploader]);

  const progressChunks = useMemo(
    () =>
      Array.from({ length: Math.max(1, recordState === 'recording' ? chunkIndex + 1 : chunkIndex) }, (_, index) => {
        const uploaded = chunks.find((chunk) => chunk.chunkIndex === index);
        return {
          chunkIndex: index,
          status: uploaded?.status ?? ('pending' as const),
        };
      }),
    [chunkIndex, chunks, recordState],
  );

  const error = captureError ?? uploadError ?? mobileError;

  return {
    recordState,
    recordingMode,
    duration,
    chunkIndex,
    mediaStream,
    warnings,
    progressChunks,
    isPausedBySilence,
    isUploading: isUploading || isCompleting,
    error,
    startWithMobilePolish,
    stopWithMobilePolish,
    resetSession,
    isCancelModalOpen,
    cancelTier,
    hasCompletedChunks,
    sessionId,
    handleCancelPress,
    handleCancelModalDismiss,
    handleDiscardSession,
    handleFinishEarly,
  };
}
