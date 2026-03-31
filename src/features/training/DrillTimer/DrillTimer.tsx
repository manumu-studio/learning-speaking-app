// DrillTimer — displays countdown or count-up timer with MM:SS format
'use client';

import { useEffect, useRef, useState } from 'react';
import type { DrillTimerProps } from './DrillTimer.types';

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export function DrillTimer({ mode, duration, isRunning, onComplete, className }: DrillTimerProps) {
  const [elapsed, setElapsed] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const completedRef = useRef(false);

  useEffect(() => {
    if (!isRunning) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    intervalRef.current = setInterval(() => {
      setElapsed((prev) => {
        const next = prev + 1;
        if (next >= duration && !completedRef.current) {
          completedRef.current = true;
          onComplete?.();
        }
        return next;
      });
    }, 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isRunning, duration, onComplete]);

  const displaySeconds =
    mode === 'countdown' ? Math.max(duration - elapsed, 0) : Math.min(elapsed, duration);

  const isNearEnd = mode === 'countdown' && displaySeconds <= 5 && displaySeconds > 0;

  return (
    <div className={className}>
      <span
        className={`font-mono text-2xl font-bold ${isNearEnd ? 'animate-pulse text-amber-500' : 'text-zinc-200'}`}
      >
        {formatTime(displaySeconds)}
      </span>
    </div>
  );
}
