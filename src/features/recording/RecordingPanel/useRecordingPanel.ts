// Orchestrates chunked AudioWorklet recording, parallel upload, and session completion
'use client';

import { useCallback, useMemo, useState } from 'react';
import type { RecordingPanelProps } from './RecordingPanel.types';
import { useRecordingPanelActions } from './useRecordingPanelActions';
import { useRecordingPanelMedia } from './useRecordingPanelMedia';

const CHUNK_DURATION_SECS = 120;
const PAUSE_LOCKOUT_SECS = 10;
const TIER_1_MAX_SECS = 45;
const TIER_2_MAX_SECS = 120;

type CancelTier = 'silent' | 'prompt' | 'modal';

function getCancelTier(durationSecs: number): CancelTier {
  if (durationSecs < TIER_1_MAX_SECS) { return 'silent'; }
  if (durationSecs < TIER_2_MAX_SECS) { return 'prompt'; }
  return 'modal';
}

export function useRecordingPanel(props: RecordingPanelProps) {
  const { recordingMode = 'press-to-toggle' } = props;
  const [isCompleting, setIsCompleting] = useState(false);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [mobileError, setMobileError] = useState<string | null>(null);

  const media = useRecordingPanelMedia(props, mobileError, setMobileError);

  const {
    captureState, recordState, duration, chunkIndex, mediaStream, captureError, warnings,
    chunks, sessionId, isUploading, uploadError, isPausedBySilence, silenceWarningActive,
    secondsUntilAutoStop, startWithMobilePolish, stopWithMobilePolish,
    stopRecording, pauseRecording, resumeRecording, resetRecording, resetUploader,
    abortAllUploads, waitForInFlightUploads, completeSession,
  } = media;

  const {
    handleCancelPress,
    handleCancelModalDismiss,
    handleDiscardSession,
    handleFinishEarly,
  } = useRecordingPanelActions({
    recordState, captureState, duration, sessionId, isCompleting, setIsCompleting,
    setIsCancelModalOpen, stopRecording, resetRecording, resetUploader,
    abortAllUploads, waitForInFlightUploads, completeSession,
  });

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
        return { chunkIndex: index, status: uploaded?.status ?? ('pending' as const) };
      }),
    [chunkIndex, chunks, recordState],
  );

  const error = captureError ?? uploadError ?? mobileError;
  const isPaused = captureState === 'paused';
  const durationInCurrentChunk = duration % CHUNK_DURATION_SECS;
  const isNearChunkBoundary = durationInCurrentChunk >= (CHUNK_DURATION_SECS - PAUSE_LOCKOUT_SECS);
  const hasUnconfirmedChunk = chunks.some((c) => c.status === 'uploading');
  const canPause = recordState === 'recording' && !isNearChunkBoundary && !hasUnconfirmedChunk;
  const hasCompletedChunks = chunks.some((chunk) => chunk.status === 'completed');
  const cancelTier = getCancelTier(duration);

  return {
    recordState, recordingMode, duration, chunkIndex, mediaStream, warnings, progressChunks,
    isPaused, isPausedBySilence, canPause, silenceWarningActive, secondsUntilAutoStop,
    isUploading: isUploading || isCompleting, error, startWithMobilePolish, stopWithMobilePolish,
    pauseRecording, resumeRecording, resetSession, isCancelModalOpen, cancelTier,
    hasCompletedChunks, sessionId, handleCancelPress, handleCancelModalDismiss,
    handleDiscardSession, handleFinishEarly,
  };
}
