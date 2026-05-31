// Displays elapsed recording time in MM:SS format
'use client';

import type { SessionTimerProps } from './SessionTimer.types';

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export function SessionTimer({ seconds, isActive, limitSecs }: SessionTimerProps) {
  const remaining =
    limitSecs !== undefined && isActive ? limitSecs - seconds : null;
  const showCountdown =
    remaining !== null && remaining <= 10 && remaining >= 0;

  const displaySeconds = showCountdown ? remaining : seconds;
  const colorClass = showCountdown
    ? 'text-amber-500 dark:text-amber-400'
    : isActive
      ? 'text-slate-700 dark:text-white'
      : 'text-slate-500 dark:text-white/80';

  return (
    <div
      role="timer"
      aria-live="off"
      aria-label="Session timer"
      style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", system-ui, sans-serif' }}
      className={`text-3xl sm:text-4xl font-extralight tracking-[0.15em] tabular-nums transition-colors duration-300 ${colorClass}`}
    >
      {formatTime(displaySeconds)}
    </div>
  );
}
