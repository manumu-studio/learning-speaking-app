// Orchestrates chunked AudioWorklet recording, upload, and session completion
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

export function useRecordingPanel({
  topic,
  focus,
  recordingMode = 'press-to-toggle',
  promptUsed = null,
}: RecordingPanelProps) {
  const router = useRouter();
  const [mobileError, setMobileError] = useState<string | null>(null);
  const [isCompleting, setIsCompleting] = useState(false);
  const { addSession } = useProcessingSessions();

  const {
    chunks,
    uploadChunk,
    completeSession,
    isUploading,
    error: uploadError,
    resetUploader,
  } = useChunkUploader({ topic, focus, promptUsed });

  const handleChunkReady = useCallback(
    (event: Parameters<typeof uploadChunk>[0]) => {
      uploadChunk(event);
    },
    [uploadChunk],
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

  useEffect(() => {
    if (captureState !== 'stopped' || isCompleting) {
      return;
    }

    const finalize = async () => {
      setIsCompleting(true);
      const sessionId = await completeSession(duration);
      if (sessionId) {
        addSession(sessionId);
        router.push(`/session/${sessionId}`);
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
  }, [resetRecording, resetUploader]);

  const progressChunks = useMemo(
    () =>
      Array.from({ length: Math.max(1, chunkIndex + 1) }, (_, index) => {
        const uploaded = chunks.find((chunk) => chunk.chunkIndex === index);
        return {
          chunkIndex: index,
          status: uploaded?.status ?? ('pending' as const),
        };
      }),
    [chunkIndex, chunks],
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
  };
}
