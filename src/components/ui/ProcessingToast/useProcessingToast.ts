// useProcessingToast — polling, auto-dismiss, and modal state for the processing toast
'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { z } from 'zod';
import { useProcessingSessions } from '@/features/session/ProcessingSessionsContext';
import type { ProcessingStatusProps } from '@/components/ui/ProcessingStatus/ProcessingStatus.types';
import type { ToastSessionStatus } from './ProcessingToast.types';

const POLL_INTERVAL_MS = 3000;
const AUTO_DISMISS_MS = 8000;

const sessionStatusSchema = z.object({
  status: z.enum([
    'CREATED', 'UPLOADED', 'CHUNKS_PROCESSING', 'AWAITING_FINAL',
    'PROCESSING_FINAL', 'TRANSCRIBING', 'SCORING', 'ANALYZING',
    'DONE', 'FAILED', 'CANCELLED',
  ]),
  errorMessage: z.string().nullable().optional(),
});

export type ApiSessionStatus = ProcessingStatusProps['status'];

export function toToastStatus(status: ApiSessionStatus): ToastSessionStatus {
  if (status === 'CREATED') return 'UPLOADED';
  if (status === 'AWAITING_FINAL' || status === 'PROCESSING_FINAL') return 'ANALYZING';
  if (status === 'CANCELLED') return 'FAILED';
  return status;
}

async function fetchSessionStatus(
  id: string,
): Promise<{ status: ApiSessionStatus; errorMessage: string | null } | null> {
  const response = await fetch(`/api/sessions/${id}`);
  if (!response.ok) return null;
  const data: unknown = await response.json();
  const parsed = sessionStatusSchema.safeParse(data);
  if (!parsed.success) return null;
  return { status: parsed.data.status, errorMessage: parsed.data.errorMessage ?? null };
}

// Manages auto-dismiss timers per session
function useDismissTimers(removeSession: (id: string) => void) {
  const timersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const clear = useCallback((id: string) => {
    const t = timersRef.current[id];
    if (t) { clearTimeout(t); delete timersRef.current[id]; }
  }, []);

  const schedule = useCallback((id: string) => {
    clear(id);
    timersRef.current[id] = setTimeout(() => { removeSession(id); clear(id); }, AUTO_DISMISS_MS);
  }, [clear, removeSession]);

  // Cleanup all timers on unmount
  useEffect(() => {
    const timers = timersRef.current;
    return () => { Object.values(timers).forEach((t) => { clearTimeout(t); }); };
  }, []);

  return { schedule, clear };
}

export function useProcessingToast() {
  const router = useRouter();
  const { sessions, removeSession } = useProcessingSessions();
  const [statuses, setStatuses] = useState<Record<string, ApiSessionStatus>>({});
  const [errorMessages, setErrorMessages] = useState<Record<string, string | null>>({});
  const [modalSessionId, setModalSessionId] = useState<string | null>(null);
  const scheduledDismissRef = useRef<Set<string>>(new Set());
  const { schedule: scheduleAutoDismiss, clear: clearDismissTimer } = useDismissTimers(removeSession);

  const handleModalClose = useCallback(() => {
    if (modalSessionId) {
      const s = statuses[modalSessionId];
      if (s === 'DONE' || s === 'FAILED') scheduleAutoDismiss(modalSessionId);
    }
    setModalSessionId(null);
  }, [modalSessionId, scheduleAutoDismiss, statuses]);

  const handleViewSession = useCallback((id: string) => {
    router.push(`/session/${id}`);
    removeSession(id);
    clearDismissTimer(id);
    setModalSessionId(null);
  }, [clearDismissTimer, removeSession, router]);

  // Polling: fetch status for all active sessions
  useEffect(() => {
    if (sessions.length === 0) return;
    let cancelled = false;

    const poll = async () => {
      const results = await Promise.allSettled(
        sessions.map(async (session) => ({ session, result: await fetchSessionStatus(session.id) })),
      );
      if (cancelled) return;

      for (const entry of results) {
        if (entry.status !== 'fulfilled' || !entry.value.result) continue;
        const { session, result } = entry.value;

        setStatuses((prev) => {
          const existing = prev[session.id];
          if (existing === 'DONE' || existing === 'FAILED') return prev;
          return { ...prev, [session.id]: result.status };
        });
        setErrorMessages((prev) => ({ ...prev, [session.id]: result.errorMessage }));

        const terminal = result.status === 'DONE' || result.status === 'FAILED';
        if (terminal && !scheduledDismissRef.current.has(session.id) && modalSessionId !== session.id) {
          scheduledDismissRef.current.add(session.id);
          scheduleAutoDismiss(session.id);
        }
      }
    };

    void poll();
    const interval = setInterval(() => { void poll(); }, POLL_INTERVAL_MS);
    return () => { cancelled = true; clearInterval(interval); };
  }, [modalSessionId, scheduleAutoDismiss, sessions]);

  // Pause auto-dismiss while modal is open
  useEffect(() => {
    if (modalSessionId) clearDismissTimer(modalSessionId);
  }, [clearDismissTimer, modalSessionId]);

  // Escape key closes modal
  useEffect(() => {
    if (!modalSessionId) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') handleModalClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [handleModalClose, modalSessionId]);

  const latestSession = sessions[sessions.length - 1] ?? null;
  const latestApiStatus = latestSession ? (statuses[latestSession.id] ?? 'UPLOADED') : null;
  const latestToastStatus = latestApiStatus ? toToastStatus(latestApiStatus) : null;
  const modalApiStatus = modalSessionId ? (statuses[modalSessionId] ?? null) : null;
  const modalToastStatus = modalApiStatus ? toToastStatus(modalApiStatus) : null;

  return {
    sessions, latestSession, latestToastStatus,
    modalSessionId, modalApiStatus, modalToastStatus,
    errorMessages, extraCount: sessions.length - 1,
    setModalSessionId, handleModalClose, handleViewSession,
  };
}
