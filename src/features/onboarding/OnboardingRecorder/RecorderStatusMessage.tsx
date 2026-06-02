// Accessible status message shown below the recording controls
'use client';

import type { RecordingStatus } from '@/features/recording/recordingState.types';

interface RecorderStatusMessageProps {
  uiState: RecordingStatus;
  error: string | null;
  isPausedBySilence: boolean;
  isUploading: boolean;
}

export function RecorderStatusMessage({
  uiState,
  error,
  isPausedBySilence,
  isUploading,
}: RecorderStatusMessageProps) {
  return (
    <div className="text-center min-h-[48px] w-full" aria-live="polite" role="status">
      {error && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/50 p-4">
          <p className="text-sm text-amber-800 dark:text-amber-300">{error}</p>
        </div>
      )}
      {!error && uiState === 'idle' && (
        <p className="text-gray-500 dark:text-gray-400">Press the button to start</p>
      )}
      {!error && uiState === 'recording' && !isPausedBySilence && (
        <p className="font-medium text-gray-700 dark:text-gray-200">Recording…</p>
      )}
      {!error && uiState === 'recording' && isPausedBySilence && (
        <p className="text-amber-700 dark:text-amber-300">Paused — waiting for speech</p>
      )}
      {!error && uiState === 'validating' && (
        <p className="text-blue-600 dark:text-blue-400">Checking recording…</p>
      )}
      {isUploading && uiState === 'stopped' && (
        <p className="text-blue-600 dark:text-blue-400">Uploading…</p>
      )}
    </div>
  );
}
