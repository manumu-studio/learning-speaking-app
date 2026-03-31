// Displays elapsed recording time in MM:SS format
'use client';

import type { SessionTimerProps } from './SessionTimer.types';

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export function SessionTimer({ seconds, isActive }: SessionTimerProps) {
  return (
    <div
      className={`text-5xl sm:text-6xl font-mono font-bold tracking-widest transition-colors duration-300 ${
        isActive
          ? 'text-red-500 dark:text-red-400'
          : 'text-gray-400 dark:text-gray-500'
      }`}
    >
      {formatTime(seconds)}
    </div>
  );
}
