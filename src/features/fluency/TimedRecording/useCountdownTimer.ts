// Custom hook encapsulating the 1-second countdown interval with grace period logic
'use client';

import { useRef, useEffect } from 'react';

const GRACE_PERIOD_SECS = 5;

interface UseCountdownTimerParams {
  isActive: boolean;
  setTimeRemaining: React.Dispatch<React.SetStateAction<number>>;
  setIsActive: React.Dispatch<React.SetStateAction<boolean>>;
  setIsGracePeriod: React.Dispatch<React.SetStateAction<boolean>>;
}

/** Runs a 1-second interval when active, handles grace period, cleans up on deactivate */
export function useCountdownTimer({
  isActive,
  setTimeRemaining,
  setIsActive,
  setIsGracePeriod,
}: UseCountdownTimerParams): void {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!isActive) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    intervalRef.current = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= -GRACE_PERIOD_SECS) {
          setIsActive(false);
          setIsGracePeriod(false);
          return 0;
        }
        if (prev <= 0) {
          setIsGracePeriod(true);
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isActive, setTimeRemaining, setIsActive, setIsGracePeriod]);
}
