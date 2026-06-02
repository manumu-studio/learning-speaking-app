// Start / stop recording button for timed fluency sessions
'use client';

export interface RecordButtonProps {
  isActive: boolean;
  isProcessing: boolean;
  onStart: () => void;
  onStop: () => void;
}

/** Toggle button that switches between Start and Stop recording states */
export function RecordButton({ isActive, isProcessing, onStart, onStop }: RecordButtonProps) {
  if (isActive) {
    return (
      <button
        type="button"
        onClick={onStop}
        disabled={isProcessing}
        className="rounded-xl bg-slate-700 px-8 py-3 text-lg font-semibold text-white transition-colors hover:bg-slate-600 disabled:opacity-50 dark:bg-slate-600 dark:hover:bg-slate-500"
      >
        Stop Recording
      </button>
    );
  }
  return (
    <button
      type="button"
      onClick={onStart}
      disabled={isProcessing}
      className="rounded-xl bg-emerald-600 px-8 py-3 text-lg font-semibold text-white transition-colors hover:bg-emerald-500 disabled:opacity-50 dark:bg-emerald-700 dark:hover:bg-emerald-600"
    >
      {isProcessing ? 'Processing...' : 'Start Recording'}
    </button>
  );
}
