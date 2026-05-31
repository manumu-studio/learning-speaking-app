// Modal for confirming cancel action during active recording
'use client';

import type { CancelRecordingModalProps } from './CancelRecordingModal.types';

export function CancelRecordingModal({
  isOpen,
  durationSecs,
  hasCompletedChunks,
  onDiscard,
  onFinishEarly,
  onDismiss,
}: CancelRecordingModalProps) {
  if (!isOpen) {
    return null;
  }

  const showFinishEarly = hasCompletedChunks && durationSecs >= 120;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="cancel-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
    >
      <div className="mx-4 w-full max-w-sm rounded-xl bg-white p-6 shadow-xl dark:bg-zinc-900">
        <h2
          id="cancel-modal-title"
          className="text-lg font-semibold text-gray-900 dark:text-white"
        >
          Stop Recording?
        </h2>

        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          {showFinishEarly
            ? 'You can discard this session entirely, or finish early and see results from what was already processed.'
            : 'Are you sure you want to stop? This recording will be discarded.'}
        </p>

        <div className="mt-6 flex flex-col gap-3">
          {showFinishEarly && (
            <button
              type="button"
              onClick={onFinishEarly}
              className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
            >
              Finish Early — See Partial Results
            </button>
          )}

          <button
            type="button"
            onClick={onDiscard}
            className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-500 dark:border-zinc-700 dark:text-gray-300 dark:hover:bg-zinc-800"
          >
            Discard Session
          </button>

          <button
            type="button"
            onClick={onDismiss}
            className="w-full rounded-lg px-4 py-2.5 text-sm font-medium text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            Keep Recording
          </button>
        </div>
      </div>
    </div>
  );
}
