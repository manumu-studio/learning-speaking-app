// Status message display area shown at the bottom of the recording panel
'use client';

import type { RecordingStatus } from '@/features/recording/recordingState.types';

interface RecordingStatusMessagesProps {
  recordState: RecordingStatus;
  isPaused: boolean;
  isPausedBySilence: boolean;
  silenceWarningActive: boolean;
  error: string | null;
  idleHint: string | null;
}

export function RecordingStatusMessages({
  recordState,
  isPaused,
  isPausedBySilence,
  silenceWarningActive,
  error,
  idleHint,
}: RecordingStatusMessagesProps) {
  return (
    <div className="text-center min-h-6" aria-live="polite" role="status">
      {error && (
        <div className="rounded-lg bg-red-500/10 p-2.5">
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}
      {!error && recordState === 'idle' && idleHint !== null && (
        <p className="text-zinc-400 dark:text-zinc-500 text-sm">{idleHint}</p>
      )}
      {!error && recordState === 'recording' && isPausedBySilence && !silenceWarningActive && (
        <p className="text-sm font-medium text-amber-600 dark:text-amber-400">
          Paused — no speech detected
        </p>
      )}
      {!error && isPaused && (
        <p className="text-emerald-600 dark:text-emerald-400 text-sm font-medium">
          Paused — tap Resume to continue
        </p>
      )}
      {!error && recordState === 'stopped' && (
        <p className="text-sky-600 dark:text-sky-400 text-sm font-medium">
          Finalizing session...
        </p>
      )}
    </div>
  );
}
