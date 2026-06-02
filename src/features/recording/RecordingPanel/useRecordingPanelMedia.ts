// Bundles uploader, AudioWorklet, silence detector, and mobile recording for RecordingPanel
'use client';

import { useCallback } from 'react';
import { useAudioWorklet } from '@/features/recording/useAudioWorklet';
import { useChunkUploader } from '@/features/recording/useChunkUploader';
import { useMobileRecording } from '@/features/recording/useMobileRecording';
import { useSilenceDetector } from '@/features/recording/useSilenceDetector';
import type { RecordingStatus } from '@/features/recording/recordingState.types';
import type { RecordingPanelProps } from './RecordingPanel.types';

function mapRecordingState(
  state: 'idle' | 'recording' | 'paused' | 'stopping' | 'stopped' | 'error',
): RecordingStatus {
  if (state === 'recording' || state === 'stopping') { return 'recording'; }
  if (state === 'paused') { return 'paused'; }
  if (state === 'stopped') { return 'stopped'; }
  return 'idle';
}

export interface RecordingPanelMediaReturn {
  captureState: 'idle' | 'recording' | 'paused' | 'stopping' | 'stopped' | 'error';
  recordState: RecordingStatus;
  duration: number;
  chunkIndex: number;
  mediaStream: MediaStream | null;
  captureError: string | null;
  warnings: string[];
  chunks: ReturnType<typeof useChunkUploader>['chunks'];
  sessionId: string | null;
  isUploading: boolean;
  uploadError: string | null;
  isPausedBySilence: boolean;
  silenceWarningActive: boolean;
  secondsUntilAutoStop: number | null;
  startWithMobilePolish: ReturnType<typeof useMobileRecording>['startWithMobilePolish'];
  stopWithMobilePolish: ReturnType<typeof useMobileRecording>['stopWithMobilePolish'];
  mobileError: string | null;
  setMobileError: (e: string | null) => void;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<void>;
  pauseRecording: () => void;
  resumeRecording: () => void;
  resetRecording: () => void;
  resetUploader: () => void;
  abortAllUploads: () => void;
  waitForInFlightUploads: () => Promise<void>;
  completeSession: (duration: number) => Promise<string | null>;
}

export function useRecordingPanelMedia(
  props: RecordingPanelProps,
  mobileError: string | null,
  setMobileError: (e: string | null) => void,
): RecordingPanelMediaReturn {
  const { topic, focus, promptUsed = null } = props;

  const {
    chunks, sessionId, uploadChunkIndependent, completeSession, isUploading,
    error: uploadError, resetUploader, abortAllUploads, waitForInFlightUploads,
  } = useChunkUploader({ topic, focus, promptUsed });

  const handleChunkReady = useCallback(
    (event: Parameters<typeof uploadChunkIndependent>[0]) => { uploadChunkIndependent(event); },
    [uploadChunkIndependent],
  );

  const {
    state: captureState, duration, chunkIndex, mediaStream, error: captureError, warnings,
    startRecording, stopRecording, pauseRecording, resumeRecording, resetRecording,
  } = useAudioWorklet({ onChunkReady: handleChunkReady });

  const recordState = mapRecordingState(captureState);

  const handleAutoStop = useCallback(() => { void stopRecording(); }, [stopRecording]);

  const { isPausedBySilence, silenceWarningActive, secondsUntilAutoStop } = useSilenceDetector({
    stream: mediaStream, isRecording: recordState === 'recording', onAutoStop: handleAutoStop,
  });

  const { startWithMobilePolish, stopWithMobilePolish } = useMobileRecording({
    isRecording: recordState === 'recording',
    mediaStream,
    startRecording: () => startRecording(),
    stopRecording: () => { void stopRecording(); },
    onInterrupted: setMobileError,
  });

  return {
    captureState, recordState, duration, chunkIndex, mediaStream, captureError, warnings,
    chunks, sessionId, isUploading, uploadError,
    isPausedBySilence, silenceWarningActive, secondsUntilAutoStop,
    startWithMobilePolish, stopWithMobilePolish, mobileError, setMobileError,
    startRecording, stopRecording, pauseRecording, resumeRecording, resetRecording,
    resetUploader, abortAllUploads, waitForInFlightUploads, completeSession,
  };
}
