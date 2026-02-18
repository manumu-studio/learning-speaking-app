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
      className={`text-6xl font-mono font-bold transition-colors ${
        isActive ? 'text-red-600' : 'text-gray-700'
      }`}
    >
      {formatTime(seconds)}
    </div>
  );
}
