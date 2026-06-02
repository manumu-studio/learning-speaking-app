// Cancel, Pause, and Resume control buttons shown during an active recording
'use client';

import type { RecordingStatus } from '@/features/recording/recordingState.types';

interface RecordingControlsProps {
  recordState: RecordingStatus;
  isPaused: boolean;
  canPause: boolean;
  onCancel: () => void;
  onPause: () => void;
  onResume: () => void;
}

export function RecordingControls({
  recordState,
  isPaused,
  canPause,
  onCancel,
  onPause,
  onResume,
}: RecordingControlsProps) {
  const isActive = recordState === 'recording' || isPaused;
  if (!isActive) return null;

  return (
    <div className="flex items-center justify-center gap-3">
      <button
        type="button"
        onClick={onCancel}
        aria-label="Cancel recording"
        className="flex items-center gap-1.5 rounded-full bg-zinc-100 px-5 py-2 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-200 dark:bg-zinc-800/80 dark:text-zinc-400 dark:hover:bg-zinc-700/80"
      >
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-4 w-4">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
        Cancel
      </button>

      {recordState === 'recording' && (
        <button
          type="button"
          onClick={onPause}
          disabled={!canPause}
          aria-label="Pause recording"
          className="flex items-center gap-1.5 rounded-full bg-zinc-100 px-5 py-2 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-zinc-800/80 dark:text-zinc-400 dark:hover:bg-zinc-700/80"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24" className="h-4 w-4">
            <rect x="6" y="5" width="4" height="14" rx="1" />
            <rect x="14" y="5" width="4" height="14" rx="1" />
          </svg>
          Pause
        </button>
      )}

      {isPaused && (
        <button
          type="button"
          onClick={onResume}
          aria-label="Resume recording"
          className="flex items-center gap-1.5 rounded-full bg-emerald-100 px-5 py-2 text-sm font-medium text-emerald-700 transition-colors hover:bg-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:hover:bg-emerald-900/50"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24" className="h-4 w-4">
            <path d="M8 5.14v14l11-7-11-7z" />
          </svg>
          Resume
        </button>
      )}
    </div>
  );
}
