// Hook for polling session status until processing completes
import { useState, useEffect, useCallback } from 'react';
import type { SessionDetail, UseSessionStatusReturn } from '@/features/session/useSessionStatus.types';

const POLL_INTERVAL_FAST = 3000;
const POLL_INTERVAL_SLOW = 10000;
const FAST_POLL_DURATION = 30000;
const MAX_POLL_DURATION = 300000;

const PROCESSING_STATUSES = ['UPLOADED', 'TRANSCRIBING', 'ANALYZING'] as const;

export function useSessionStatus(sessionId: string): UseSessionStatusReturn {
  const [session, setSession] = useState<SessionDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pollStartTime] = useState(Date.now());

  const fetchSession = useCallback(async () => {
    try {
      const response = await fetch(`/api/sessions/${sessionId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch session');
      }
      const data: unknown = await response.json();
      setSession(data as SessionDetail);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, [sessionId]);

  const retry = useCallback(() => {
    setIsLoading(true);
    setError(null);
    fetchSession();
  }, [fetchSession]);

  useEffect(() => {
    fetchSession();
  }, [fetchSession]);

  useEffect(() => {
    if (!session) return;

    const isProcessing = (PROCESSING_STATUSES as readonly string[]).includes(session.status);
    if (!isProcessing) return;

    const elapsed = Date.now() - pollStartTime;
    if (elapsed > MAX_POLL_DURATION) {
      setError('Processing is taking longer than expected. Please check back later.');
      return;
    }

    const interval = elapsed < FAST_POLL_DURATION ? POLL_INTERVAL_FAST : POLL_INTERVAL_SLOW;
    const timer = setInterval(fetchSession, interval);
    return () => clearInterval(timer);
  }, [session, fetchSession, pollStartTime]);

  return {
    session,
    isLoading,
    isProcessing: session !== null && (PROCESSING_STATUSES as readonly string[]).includes(session.status),
    isDone: session?.status === 'DONE',
    isFailed: session?.status === 'FAILED',
    error,
    retry,
  };
}
