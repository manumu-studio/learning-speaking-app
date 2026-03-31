// Large prominent record/stop button with visual state changes and glow effects
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
    <div className="relative">
      {/* Ambient glow ring */}
      {!isStopped && !disabled && (
        <div
          className={`absolute inset-0 rounded-full blur-xl transition-opacity duration-500 ${
            isIdle ? 'bg-emerald-500/30' : ''
          } ${isRecording ? 'bg-red-500/40 animate-pulse' : ''}`}
          style={{ transform: 'scale(1.15)' }}
        />
      )}

      <button
        onClick={handleClick}
        disabled={disabled || isStopped}
        aria-label={isIdle ? 'Start speaking session' : isRecording ? 'Stop session' : 'Session complete'}
        className={`
          relative flex flex-col items-center justify-center
          w-40 h-40 sm:w-48 sm:h-48 rounded-full
          transition-all duration-300 ease-out
          focus:outline-none focus:ring-4 focus:ring-offset-2 dark:focus:ring-offset-black
          active:scale-95
          ${isIdle
            ? 'bg-linear-to-br from-emerald-400 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 focus:ring-emerald-500 shadow-lg shadow-emerald-500/25 hover:shadow-xl hover:shadow-emerald-500/30'
            : ''}
          ${isRecording
            ? 'bg-linear-to-br from-red-400 to-red-600 focus:ring-red-500 shadow-lg shadow-red-500/30 animate-[recording-pulse_2s_ease-in-out_infinite]'
            : ''}
          ${isStopped ? 'bg-gray-400 dark:bg-gray-600 cursor-not-allowed shadow-none' : ''}
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        `}
      >
        <div className="text-white mb-1.5">
          {isIdle && (
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-12 h-12 sm:w-16 sm:h-16 drop-shadow-sm">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
            </svg>
          )}
          {isRecording && (
            <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24" className="w-12 h-12 sm:w-16 sm:h-16 drop-shadow-sm">
              <rect x="6" y="6" width="12" height="12" rx="3" />
            </svg>
          )}
          {isStopped && (
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-12 h-12 sm:w-16 sm:h-16">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          )}
        </div>
        <span className="text-white/90 font-semibold text-xs sm:text-sm text-center px-4 tracking-wide">
          {isIdle && 'Start Session'}
          {isRecording && 'Stop'}
          {isStopped && 'Complete'}
        </span>
      </button>
    </div>
  );
}
