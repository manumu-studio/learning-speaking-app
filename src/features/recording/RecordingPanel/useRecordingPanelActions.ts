// Extracted cancel/finish/discard action handlers for useRecordingPanel
'use client';

import { useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useProcessingSessions } from '@/features/session/ProcessingSessionsContext';
import type { RecordingStatus } from '@/features/recording/recordingState.types';

interface UseRecordingPanelActionsOptions {
  recordState: RecordingStatus;
  captureState: string;
  duration: number;
  sessionId: string | null;
  isCompleting: boolean;
  setIsCompleting: (v: boolean) => void;
  setIsCancelModalOpen: (v: boolean) => void;
  stopRecording: () => Promise<void>;
  resetRecording: () => void;
  resetUploader: () => void;
  abortAllUploads: () => void;
  waitForInFlightUploads: () => Promise<void>;
  completeSession: (duration: number) => Promise<string | null>;
}

export interface RecordingPanelActions {
  handleCancelPress: () => Promise<void>;
  handleCancelModalDismiss: () => void;
  handleDiscardSession: () => Promise<void>;
  handleFinishEarly: () => Promise<void>;
}

const TIER_1_MAX_SECS = 45;

async function cancelSessionApi(sessionId: string): Promise<void> {
  try {
    await fetch('/api/internal/cancel-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId }),
    });
  } catch {
    // Non-fatal — user is navigating away regardless
  }
}

interface FinalizeSessionParams {
  completeSession: (d: number) => Promise<string | null>;
  duration: number;
  addSession: (id: string) => void;
  setIsCompleting: (v: boolean) => void;
  pushRoute: (path: string) => void;
}

async function finalizeSession(p: FinalizeSessionParams): Promise<void> {
  p.setIsCompleting(true);
  const completedId = await p.completeSession(p.duration);
  if (completedId) {
    p.addSession(completedId);
    p.pushRoute(`/session/${completedId}`);
    return;
  }
  p.setIsCompleting(false);
}

export function useRecordingPanelActions({
  recordState, captureState, duration, sessionId, isCompleting,
  setIsCompleting, setIsCancelModalOpen, stopRecording, resetRecording,
  resetUploader, abortAllUploads, waitForInFlightUploads, completeSession,
}: UseRecordingPanelActionsOptions): RecordingPanelActions {
  const router = useRouter();
  const { addSession } = useProcessingSessions();

  const handleCancelPress = useCallback(async () => {
    if (duration < TIER_1_MAX_SECS) {
      abortAllUploads();
      await stopRecording();
      resetRecording();
      resetUploader();
      router.push('/');
      return;
    }
    setIsCancelModalOpen(true);
  }, [abortAllUploads, duration, resetRecording, resetUploader, router, setIsCancelModalOpen, stopRecording]);

  const handleCancelModalDismiss = useCallback(() => {
    setIsCancelModalOpen(false);
  }, [setIsCancelModalOpen]);

  const handleDiscardSession = useCallback(async () => {
    abortAllUploads();
    if (recordState === 'recording' || recordState === 'paused') { await stopRecording(); }
    if (sessionId) { await cancelSessionApi(sessionId); }
    resetRecording();
    resetUploader();
    setIsCancelModalOpen(false);
    router.push('/');
  }, [abortAllUploads, recordState, resetRecording, resetUploader, router, sessionId, setIsCancelModalOpen, stopRecording]);

  const handleFinishEarly = useCallback(async () => {
    if (recordState === 'recording' || recordState === 'paused') { await stopRecording(); }
    setIsCancelModalOpen(false);
    await waitForInFlightUploads();
    await finalizeSession({ completeSession, duration, addSession, setIsCompleting, pushRoute: router.push });
  }, [addSession, completeSession, duration, recordState, router, setIsCancelModalOpen, setIsCompleting, stopRecording, waitForInFlightUploads]);

  useEffect(() => {
    if (captureState !== 'stopped' || isCompleting) { return; }
    void waitForInFlightUploads().then(() =>
      finalizeSession({ completeSession, duration, addSession, setIsCompleting, pushRoute: router.push }),
    );
  }, [addSession, captureState, completeSession, duration, isCompleting, router, setIsCompleting, waitForInFlightUploads]);

  return { handleCancelPress, handleCancelModalDismiss, handleDiscardSession, handleFinishEarly };
}
