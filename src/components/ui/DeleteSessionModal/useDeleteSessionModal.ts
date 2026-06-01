// Hook that manages the delete session API call and state
'use client';

import { useCallback, useState } from 'react';

import type { UseDeleteSessionModalReturn } from './DeleteSessionModal.types';

export function useDeleteSessionModal(): UseDeleteSessionModalReturn {
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const deleteSession = useCallback(
    async (sessionId: string): Promise<boolean> => {
      setIsDeleting(true);
      setError(null);

      try {
        const response = await fetch(`/api/sessions/${sessionId}`, {
          method: 'DELETE',
          signal: AbortSignal.timeout(15_000),
        });

        if (!response.ok) {
          const message =
            response.status === 404
              ? 'Session not found.'
              : 'Failed to delete session. Please try again.';
          setError(message);
          return false;
        }

        return true;
      } catch {
        setError('Network error. Please check your connection and try again.');
        return false;
      } finally {
        setIsDeleting(false);
      }
    },
    [],
  );

  return { isDeleting, error, deleteSession };
}
