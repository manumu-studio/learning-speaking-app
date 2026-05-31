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
        ? 'Record'
        : isRecording
          ? 'Stop'
          : 'Complete';

  return (
    <div className="relative">
      {!isInactive && !disabled && (
        <div
          className={`absolute inset-0 rounded-full blur-xl transition-opacity duration-500 ${
            isIdle ? 'bg-sky-500/30' : ''
          } ${isRecording ? 'bg-sky-500/40 animate-pulse' : ''} ${
            isPaused ? 'bg-sky-500/20' : ''
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
          w-20 h-20 sm:w-28 sm:h-28 rounded-full
          transition-all duration-300 ease-out
          focus:outline-none focus:ring-4 focus:ring-offset-2 dark:focus:ring-offset-black
          active:scale-95 touch-none select-none
          ${isIdle
            ? 'bg-linear-to-br from-sky-400 to-sky-600 hover:from-sky-400 hover:to-sky-500 focus:ring-sky-500 shadow-lg shadow-sky-500/25 hover:shadow-xl hover:shadow-sky-500/30'
            : ''}
          ${isRecording
            ? 'bg-linear-to-br from-sky-400 to-sky-600 focus:ring-sky-500 shadow-lg shadow-sky-500/30 animate-[recording-pulse_2s_ease-in-out_infinite]'
            : ''}
          ${isPaused
            ? 'bg-linear-to-br from-sky-300/60 to-sky-500/60 focus:ring-sky-500 shadow-md shadow-sky-500/15 hover:from-sky-300/70 hover:to-sky-500/70'
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
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-7 h-7 sm:w-9 sm:h-9 drop-shadow-md">
              {/* Condenser mic body */}
              <rect x="9" y="2" width="6" height="12" rx="3" fill="currentColor" opacity="0.9" />
              {/* Grille lines */}
              <line x1="10" y1="5" x2="14" y2="5" stroke="white" strokeWidth="0.5" opacity="0.3" />
              <line x1="10" y1="7" x2="14" y2="7" stroke="white" strokeWidth="0.5" opacity="0.3" />
              <line x1="10" y1="9" x2="14" y2="9" stroke="white" strokeWidth="0.5" opacity="0.3" />
              <line x1="10" y1="11" x2="14" y2="11" stroke="white" strokeWidth="0.5" opacity="0.3" />
              {/* Arc cradle */}
              <path d="M7 12.5a5 5 0 0010 0" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.7" />
              {/* Stand */}
              <line x1="12" y1="17.5" x2="12" y2="20.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.7" />
              <line x1="9" y1="21" x2="15" y2="21" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.7" />
            </svg>
          )}
          {isRecording && (
            <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24" className="w-7 h-7 sm:w-9 sm:h-9 drop-shadow-sm">
              <rect x="6" y="6" width="12" height="12" rx="3" />
            </svg>
          )}
          {isPaused && (
            <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24" className="w-7 h-7 sm:w-9 sm:h-9 drop-shadow-sm">
              <path d="M8 5.14v14.72a1 1 0 001.5.86l11-7.36a1 1 0 000-1.72l-11-7.36a1 1 0 00-1.5.86z" />
            </svg>
          )}
          {isValidating && (
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-7 h-7 sm:w-9 sm:h-9 drop-shadow-sm animate-spin">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" />
            </svg>
          )}
          {isStopped && (
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-7 h-7 sm:w-9 sm:h-9">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          )}
        </div>
        <span className="text-white/90 font-normal text-xs sm:text-sm text-center px-4 tracking-wide">
          {buttonText}
        </span>
      </button>
    </div>
  );
}
