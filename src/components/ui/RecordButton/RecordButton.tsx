// Large prominent record/stop button with visual state changes and glow effects
'use client';

import type { RecordButtonProps } from './RecordButton.types';

export function RecordButton({
  state,
  recordingMode = 'press-to-toggle',
  onStart,
  onStop,
  disabled = false,
}: RecordButtonProps) {
  const isHoldMode = recordingMode === 'hold-to-record';
  const isIdle = state === 'idle';
  const isRecording = state === 'recording';
  const isPaused = state === 'paused';
  const isValidating = state === 'validating';
  const isStopped = state === 'stopped';
  const isInactive = isValidating || isStopped;

  const handleClick = () => {
    if (isHoldMode || disabled || isInactive) return;
    if (isIdle || isPaused) {
      onStart();
    } else if (isRecording) {
      onStop();
    }
  };

  const handlePointerDown = () => {
    if (!isHoldMode || disabled || isInactive) return;
    if (isIdle) onStart();
  };

  const handlePointerUp = () => {
    if (!isHoldMode || disabled) return;
    if (isRecording) onStop();
  };

  const label = isPaused
    ? 'Resume recording'
    : isValidating
      ? 'Checking recording'
      : isIdle
        ? isHoldMode
          ? 'Hold to record'
          : 'Start recording'
        : isRecording
          ? isHoldMode
            ? 'Release to stop recording'
            : 'Stop recording'
          : 'Session complete';

  const buttonText = isPaused
    ? 'Resume'
    : isValidating
      ? 'Checking...'
      : isIdle
        ? isHoldMode
          ? 'Hold to Record'
          : 'Start Session'
        : isRecording
          ? isHoldMode
            ? 'Recording...'
            : 'Stop'
          : 'Complete';

  return (
    <div className="relative">
      {!isInactive && !disabled && (
        <div
          className={`absolute inset-0 rounded-full blur-xl transition-opacity duration-500 ${
            isIdle ? 'bg-emerald-500/30' : ''
          } ${isRecording ? 'bg-red-500/40 animate-pulse' : ''} ${
            isPaused ? 'bg-emerald-500/20' : ''
          }`}
          style={{ transform: 'scale(1.15)' }}
        />
      )}

      <button
        type="button"
        onClick={handleClick}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        onPointerCancel={handlePointerUp}
        disabled={disabled || isInactive}
        aria-label={label}
        className={`
          relative flex flex-col items-center justify-center
          w-40 h-40 sm:w-48 sm:h-48 rounded-full
          transition-all duration-300 ease-out
          focus:outline-none focus:ring-4 focus:ring-offset-2 dark:focus:ring-offset-black
          active:scale-95 touch-none select-none
          ${isIdle
            ? 'bg-linear-to-br from-emerald-400 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 focus:ring-emerald-500 shadow-lg shadow-emerald-500/25 hover:shadow-xl hover:shadow-emerald-500/30'
            : ''}
          ${isRecording
            ? 'bg-linear-to-br from-red-400 to-red-600 focus:ring-red-500 shadow-lg shadow-red-500/30 animate-[recording-pulse_2s_ease-in-out_infinite]'
            : ''}
          ${isPaused
            ? 'bg-linear-to-br from-emerald-300/60 to-emerald-500/60 focus:ring-emerald-500 shadow-md shadow-emerald-500/15 hover:from-emerald-300/70 hover:to-emerald-500/70'
            : ''}
          ${isValidating
            ? 'bg-linear-to-br from-blue-400 to-blue-600 focus:ring-blue-500 shadow-lg shadow-blue-500/25 cursor-wait'
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
          {isPaused && (
            <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24" className="w-12 h-12 sm:w-16 sm:h-16 drop-shadow-sm">
              <path d="M8 5.14v14.72a1 1 0 001.5.86l11-7.36a1 1 0 000-1.72l-11-7.36a1 1 0 00-1.5.86z" />
            </svg>
          )}
          {isValidating && (
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-12 h-12 sm:w-16 sm:h-16 drop-shadow-sm animate-spin">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" />
            </svg>
          )}
          {isStopped && (
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-12 h-12 sm:w-16 sm:h-16">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          )}
        </div>
        <span className="text-white/90 font-semibold text-xs sm:text-sm text-center px-4 tracking-wide">
          {buttonText}
        </span>
      </button>
    </div>
  );
}
