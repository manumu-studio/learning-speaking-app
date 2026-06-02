'use client';
// Floating indicator and modal for background session processing

import { ProcessingStatus } from '@/components/ui/ProcessingStatus';
import type { ProcessingToastModalProps, ProcessingToastPillProps } from './ProcessingToast.types';
import type { ToastSessionStatus } from './ProcessingToast.types';
import { useProcessingToast } from './useProcessingToast';

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

function getPillClasses(status: ToastSessionStatus): string {
  if (status === 'DONE') return 'bg-green-600 text-white hover:bg-green-700';
  if (status === 'FAILED') return 'bg-red-600 text-white hover:bg-red-700';
  return 'bg-blue-600 text-white hover:bg-blue-700';
}

function isTerminal(status: ToastSessionStatus): boolean {
  return status === 'DONE' || status === 'FAILED';
}

// Floating pill button showing latest session status
function ProcessingToastPill({ toastStatus, extraCount, onClick }: ProcessingToastPillProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-medium shadow-lg transition-colors ${getPillClasses(toastStatus)}`}
      aria-live="polite"
    >
      {!isTerminal(toastStatus) && (
        <span className="h-2 w-2 animate-pulse rounded-full bg-white/80" aria-hidden="true" />
      )}
      {toastStatus === 'DONE' && <span aria-hidden="true">✓</span>}
      {toastStatus === 'FAILED' && <span aria-hidden="true">✗</span>}
      <span>{getPillLabel(toastStatus)}</span>
      {extraCount > 0 && (
        <span className="rounded-full bg-white/20 px-1.5 py-0.5 text-xs font-semibold">
          +{extraCount}
        </span>
      )}
    </button>
  );
}

// Modal dialog showing detailed processing status for a single session
function ProcessingToastModal({
  sessionId,
  status,
  toastStatus,
  errorMessage,
  onClose,
  onViewSession,
}: ProcessingToastModalProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="processing-toast-title"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-sm rounded-xl bg-white p-6 shadow-xl dark:bg-gray-900"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 rounded-md p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
          aria-label="Close"
        >
          ✕
        </button>

        <h2 id="processing-toast-title" className="sr-only">
          Session processing status
        </h2>

        <ProcessingStatus status={status} errorMessage={errorMessage} />

        {toastStatus === 'DONE' && (
          <button
            type="button"
            onClick={() => onViewSession(sessionId)}
            className="mt-4 w-full rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
          >
            View Results
          </button>
        )}

        {toastStatus === 'FAILED' && (
          <button
            type="button"
            onClick={() => onViewSession(sessionId)}
            className="mt-4 w-full rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
          >
            View Session
          </button>
        )}
      </div>
    </div>
  );
}

export function ProcessingToast() {
  const {
    sessions,
    latestSession,
    latestToastStatus,
    modalSessionId,
    modalApiStatus,
    modalToastStatus,
    errorMessages,
    extraCount,
    setModalSessionId,
    handleModalClose,
    handleViewSession,
  } = useProcessingToast();

  if (sessions.length === 0 || !latestSession || !latestToastStatus) {
    return null;
  }

  return (
    <>
      <ProcessingToastPill
        toastStatus={latestToastStatus}
        extraCount={extraCount}
        onClick={() => setModalSessionId(latestSession.id)}
      />

      {modalSessionId !== null && modalApiStatus !== null && modalToastStatus !== null && (
        <ProcessingToastModal
          sessionId={modalSessionId}
          status={modalApiStatus}
          toastStatus={modalToastStatus}
          errorMessage={errorMessages[modalSessionId] ?? null}
          onClose={handleModalClose}
          onViewSession={handleViewSession}
        />
      )}
    </>
  );
}
