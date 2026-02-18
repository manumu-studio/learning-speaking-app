// Large prominent record/stop button with visual state changes
'use client';

import type { RecordButtonProps } from './RecordButton.types';

export function RecordButton({
  state,
  onStart,
  onStop,
  disabled = false,
}: RecordButtonProps) {
  const handleClick = () => {
    if (state === 'idle') {
      onStart();
    } else if (state === 'recording') {
      onStop();
    }
  };

  const isIdle = state === 'idle';
  const isRecording = state === 'recording';
  const isStopped = state === 'stopped';

  return (
    <button
      onClick={handleClick}
      disabled={disabled || isStopped}
      className={`
        relative flex flex-col items-center justify-center
        w-48 h-48 rounded-full transition-all duration-200
        focus:outline-none focus:ring-4 focus:ring-offset-2
        ${isIdle ? 'bg-green-500 hover:bg-green-600 focus:ring-green-500' : ''}
        ${isRecording ? 'bg-red-500 hover:bg-red-600 focus:ring-red-500 animate-pulse' : ''}
        ${isStopped ? 'bg-gray-400 cursor-not-allowed' : ''}
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
      `}
    >
      <div className="text-white text-5xl mb-2">
        {isIdle && (
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-16 h-16">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
          </svg>
        )}
        {isRecording && (
          <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24" className="w-16 h-16">
            <rect x="6" y="6" width="12" height="12" rx="2" />
          </svg>
        )}
        {isStopped && (
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-16 h-16">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )}
      </div>
      <span className="text-white font-medium text-sm text-center px-4">
        {isIdle && 'Start Speaking Session'}
        {isRecording && 'Stop Session'}
        {isStopped && 'Session Complete'}
      </span>
    </button>
  );
}
