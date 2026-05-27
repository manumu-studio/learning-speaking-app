// Post-recording preview with submit, retry, and discard actions
'use client';

import type { AudioPreviewPanelProps } from './AudioPreviewPanel.types';

export function AudioPreviewPanel({
  audioPreviewUrl,
  vadWarning,
  isUploading,
  onSubmit,
  onTryAgain,
  onDiscard,
}: AudioPreviewPanelProps) {
  return (
    <div className="w-full max-w-sm space-y-4">
      <audio
        controls
        src={audioPreviewUrl}
        className="w-full"
        aria-label="Session recording preview"
      />

      {vadWarning && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950/40">
          <p className="text-sm text-amber-800 dark:text-amber-200">{vadWarning.message}</p>
        </div>
      )}

      <p className="text-center text-base font-medium text-gray-700 dark:text-gray-200 sm:text-lg">
        {isUploading ? 'Uploading... please wait' : 'Session complete! Review your recording.'}
      </p>

      {!isUploading && (
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-center sm:gap-3">
          <button
            type="button"
            aria-label="Submit recording for analysis"
            onClick={onSubmit}
            className="rounded-lg bg-blue-600 px-5 py-2.5 font-medium text-white transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:bg-blue-500 dark:hover:bg-blue-600 dark:focus:ring-offset-black sm:px-6 sm:py-3"
          >
            Submit for analysis
          </button>
          <button
            type="button"
            aria-label="Go recording again"
            onClick={onTryAgain}
            className="rounded-lg bg-gray-200 px-5 py-2.5 font-medium text-gray-700 transition-colors hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600 dark:focus:ring-offset-black sm:px-6 sm:py-3"
          >
            Go again
          </button>
          <button
            type="button"
            aria-label="Discard recording and return to dashboard"
            onClick={onDiscard}
            className="rounded-lg border border-gray-300 px-5 py-2.5 font-medium text-gray-600 transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800 dark:focus:ring-offset-black sm:px-6 sm:py-3"
          >
            Discard
          </button>
        </div>
      )}
    </div>
  );
}
