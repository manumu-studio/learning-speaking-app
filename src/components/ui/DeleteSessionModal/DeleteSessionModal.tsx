// Confirmation modal for permanently deleting a workout session
'use client';
/* eslint-disable max-lines-per-function */

import { useCallback, useEffect, useRef } from 'react';

import type { DeleteSessionModalProps } from './DeleteSessionModal.types';
import { useDeleteSessionModal } from './useDeleteSessionModal';

export function DeleteSessionModal({
  isOpen,
  sessionId,
  onClose,
  onConfirm,
  isDeleting: isDeletingExternal,
}: DeleteSessionModalProps) {
  const { isDeleting: isDeletingInternal, error, deleteSession } =
    useDeleteSessionModal();
  const overlayRef = useRef<HTMLDivElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);

  const isDeleting = isDeletingExternal ?? isDeletingInternal;

  // Focus cancel button on open
  useEffect(() => {
    if (isOpen) {
      cancelRef.current?.focus();
    }
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && !isDeleting) {
        onClose();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, isDeleting, onClose]);

  const handleOverlayClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (e.target === overlayRef.current && !isDeleting) {
        onClose();
      }
    },
    [isDeleting, onClose],
  );

  const handleDelete = useCallback(async () => {
    const success = await deleteSession(sessionId);
    if (success) {
      onConfirm();
    }
  }, [deleteSession, sessionId, onConfirm]);

  if (!isOpen) {
    return null;
  }

  return (
    <div
      ref={overlayRef}
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="delete-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm transition-opacity duration-200"
      onClick={handleOverlayClick}
    >
      <div className="mx-4 w-full max-w-sm rounded-xl bg-white p-6 shadow-xl dark:bg-gray-900">
        <h2
          id="delete-modal-title"
          className="text-lg font-semibold text-gray-900 dark:text-white"
        >
          Delete this workout?
        </h2>

        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          This will permanently delete all recordings, transcripts, and analysis
          for this session. This cannot be undone.
        </p>

        {error && (
          <p className="mt-3 text-sm text-red-600 dark:text-red-400">
            {error}
          </p>
        )}

        <div className="mt-6 flex justify-end gap-3">
          <button
            ref={cancelRef}
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-500 disabled:opacity-50 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleDelete}
            disabled={isDeleting}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600 disabled:opacity-50"
          >
            {isDeleting ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
}
