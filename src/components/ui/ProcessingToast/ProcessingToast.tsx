'use client';
// Floating indicator and modal for background session processing

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { z } from 'zod';
import { ProcessingStatus } from '@/components/ui/ProcessingStatus';
import type { ProcessingStatusProps } from '@/components/ui/ProcessingStatus/ProcessingStatus.types';
import { useProcessingSessions } from '@/features/session/ProcessingSessionsContext';
import type { ToastSessionStatus } from './ProcessingToast.types';

const POLL_INTERVAL_MS = 3000;
const AUTO_DISMISS_MS = 8000;

const sessionStatusSchema = z.object({
  status: z.enum(['CREATED', 'UPLOADED', 'CHUNKS_PROCESSING', 'AWAITING_FINAL', 'PROCESSING_FINAL', 'TRANSCRIBING', 'SCORING', 'ANALYZING', 'DONE', 'FAILED']),
  errorMessage: z.string().nullable().optional(),
});

type ApiSessionStatus = ProcessingStatusProps['status'];

function toToastStatus(status: ApiSessionStatus): ToastSessionStatus {
  if (status === 'CREATED') return 'UPLOADED';
  if (status === 'AWAITING_FINAL' || status === 'PROCESSING_FINAL') return 'ANALYZING';
  return status;
}

function getPillLabel(status: ToastSessionStatus): string {
  switch (status) {
    case 'UPLOADED':
    case 'CHUNKS_PROCESSING':
    case 'TRANSCRIBING':
      return 'Transcribing...';
    case 'SCORING':
      return 'Scoring...';
    case 'ANALYZING':
      return 'Analyzing...';
    case 'DONE':
      return 'Ready!';
    case 'FAILED':
      return 'Failed';
  }
}

function isTerminal(status: ToastSessionStatus): boolean {
  return status === 'DONE' || status === 'FAILED';
}

async function fetchSessionStatus(
  id: string,
): Promise<{ status: ApiSessionStatus; errorMessage: string | null } | null> {
  const response = await fetch(`/api/sessions/${id}`);
  if (!response.ok) return null;

  const data: unknown = await response.json();
  const parsed = sessionStatusSchema.safeParse(data);
  if (!parsed.success) return null;

  return {
    status: parsed.data.status,
    errorMessage: parsed.data.errorMessage ?? null,
  };
}

export function ProcessingToast() {
  const router = useRouter();
  const { sessions, removeSession } = useProcessingSessions();
  const [statuses, setStatuses] = useState<Record<string, ApiSessionStatus>>({});
  const [errorMessages, setErrorMessages] = useState<Record<string, string | null>>({});
  const [modalSessionId, setModalSessionId] = useState<string | null>(null);
  const dismissTimersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const scheduledDismissRef = useRef<Set<string>>(new Set());

  const latestSession = sessions[sessions.length - 1] ?? null;
  const latestToastStatus = latestSession
    ? toToastStatus(statuses[latestSession.id] ?? 'UPLOADED')
    : null;

  const clearDismissTimer = useCallback((id: string) => {
    const timer = dismissTimersRef.current[id];
    if (timer) {
      clearTimeout(timer);
      delete dismissTimersRef.current[id];
    }
  }, []);

  const scheduleAutoDismiss = useCallback(
    (id: string) => {
      clearDismissTimer(id);
      dismissTimersRef.current[id] = setTimeout(() => {
        removeSession(id);
        clearDismissTimer(id);
      }, AUTO_DISMISS_MS);
    },
    [clearDismissTimer, removeSession],
  );

  const handleModalClose = useCallback(() => {
    if (modalSessionId) {
      const status = statuses[modalSessionId];
      if (status && (status === 'DONE' || status === 'FAILED')) {
        scheduleAutoDismiss(modalSessionId);
      }
    }
    setModalSessionId(null);
  }, [modalSessionId, scheduleAutoDismiss, statuses]);

  const handleViewSession = useCallback(
    (id: string) => {
      router.push(`/session/${id}`);
      removeSession(id);
      clearDismissTimer(id);
      setModalSessionId(null);
    },
    [clearDismissTimer, removeSession, router],
  );

  useEffect(() => {
    if (sessions.length === 0) return;

    let cancelled = false;

    const pollSessions = async () => {
      const results = await Promise.allSettled(
        sessions.map(async (session) => {
          const result = await fetchSessionStatus(session.id);
          return { session, result };
        }),
      );

      if (cancelled) return;

      for (const entry of results) {
        if (entry.status !== 'fulfilled' || !entry.value.result) continue;
        const { session, result } = entry.value;

        setStatuses((prev) => {
          const existing = prev[session.id];
          if (existing === 'DONE' || existing === 'FAILED') {
            return prev;
          }
          return { ...prev, [session.id]: result.status };
        });
        setErrorMessages((prev) => ({ ...prev, [session.id]: result.errorMessage }));

        if (
          (result.status === 'DONE' || result.status === 'FAILED') &&
          !scheduledDismissRef.current.has(session.id) &&
          modalSessionId !== session.id
        ) {
          scheduledDismissRef.current.add(session.id);
          scheduleAutoDismiss(session.id);
        }
      }
    };

    void pollSessions();
    const interval = setInterval(() => {
      void pollSessions();
    }, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [modalSessionId, scheduleAutoDismiss, sessions]);

  useEffect(() => {
    const timers = dismissTimersRef.current;
    return () => {
      Object.values(timers).forEach((timer) => {
        clearTimeout(timer);
      });
    };
  }, []);

  useEffect(() => {
    if (modalSessionId) {
      clearDismissTimer(modalSessionId);
    }
  }, [clearDismissTimer, modalSessionId]);

  useEffect(() => {
    if (!modalSessionId) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') handleModalClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleModalClose, modalSessionId]);

  if (sessions.length === 0 || !latestSession || !latestToastStatus) {
    return null;
  }

  const modalStatus = modalSessionId ? statuses[modalSessionId] : null;
  const modalToastStatus = modalStatus ? toToastStatus(modalStatus) : null;
  const extraCount = sessions.length - 1;

  return (
    <>
      <button
        type="button"
        onClick={() => setModalSessionId(latestSession.id)}
        className={`fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-medium shadow-lg transition-colors ${getPillClasses(latestToastStatus)}`}
        aria-live="polite"
      >
        {!isTerminal(latestToastStatus) && (
          <span className="h-2 w-2 animate-pulse rounded-full bg-white/80" aria-hidden="true" />
        )}
        {isTerminal(latestToastStatus) && latestToastStatus === 'DONE' && (
          <span aria-hidden="true">✓</span>
        )}
        {isTerminal(latestToastStatus) && latestToastStatus === 'FAILED' && (
          <span aria-hidden="true">✗</span>
        )}
        <span>{getPillLabel(latestToastStatus)}</span>
        {extraCount > 0 && (
          <span className="rounded-full bg-white/20 px-1.5 py-0.5 text-xs font-semibold">
            +{extraCount}
          </span>
        )}
      </button>

      {modalSessionId && modalStatus && modalToastStatus && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="processing-toast-title"
          onClick={handleModalClose}
        >
          <div className="relative w-full max-w-sm rounded-xl bg-white p-6 shadow-xl dark:bg-gray-900" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={handleModalClose}
              className="absolute right-3 top-3 rounded-md p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              aria-label="Close"
            >
              ✕
            </button>

            <h2 id="processing-toast-title" className="sr-only">
              Session processing status
            </h2>

            <ProcessingStatus
              status={modalStatus}
              errorMessage={errorMessages[modalSessionId] ?? null}
            />

            {modalToastStatus === 'DONE' && (
              <button
                type="button"
                onClick={() => handleViewSession(modalSessionId)}
                className="mt-4 w-full rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
              >
                View Results
              </button>
            )}

            {modalToastStatus === 'FAILED' && (
              <button
                type="button"
                onClick={() => handleViewSession(modalSessionId)}
                className="mt-4 w-full rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
              >
                View Session
              </button>
            )}
          </div>
        </div>
      )}
    </>
  );
}

function getPillClasses(status: ToastSessionStatus): string {
  if (status === 'DONE') return 'bg-green-600 text-white hover:bg-green-700';
  if (status === 'FAILED') return 'bg-red-600 text-white hover:bg-red-700';
  return 'bg-blue-600 text-white hover:bg-blue-700';
}
