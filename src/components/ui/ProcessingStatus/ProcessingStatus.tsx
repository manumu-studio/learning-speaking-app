// Displays current processing step with animated visual indicator
import type { ProcessingStatusProps } from './ProcessingStatus.types';

const STEPS = [
  { key: 'UPLOADED', label: 'Uploaded' },
  { key: 'CHUNKS_PROCESSING', label: 'Processing audio segments...' },
  { key: 'TRANSCRIBING', label: 'Transcribing your speech...' },
  { key: 'SCORING', label: 'Scoring pronunciation...' },
  { key: 'ANALYZING', label: 'Analyzing patterns...' },
  { key: 'DONE', label: 'Done!' },
] as const;

type DisplayStepKey = (typeof STEPS)[number]['key'];

function resolveDisplayStatus(status: ProcessingStatusProps['status']): DisplayStepKey | 'FAILED' | 'CREATED' {
  if (status === 'AWAITING_FINAL' || status === 'PROCESSING_FINAL') {
    return 'ANALYZING';
  }
  if (status === 'CREATED') {
    return 'CREATED';
  }
  if (status === 'FAILED' || status === 'CANCELLED') {
    return 'FAILED';
  }
  return status;
}

export function ProcessingStatus({ status, errorMessage, onRetry, partialData }: ProcessingStatusProps) {
  const displayStatus = resolveDisplayStatus(status);

  const progressiveSteps = partialData
    ? [
        { key: 'transcript', label: 'Transcript', ready: partialData.hasTranscript },
        { key: 'pronunciation', label: 'Pronunciation scores', ready: partialData.hasPronunciation },
        { key: 'insights', label: 'Coaching insights', ready: partialData.hasInsights },
        { key: 'pitch', label: 'Pitch contour', ready: partialData.hasPitchContour },
      ]
    : [];

  if (displayStatus === 'FAILED') {
    return (
      <div
        role="alert"
        aria-live="assertive"
        className="rounded-lg border border-red-200 bg-red-50 p-6"
      >
        <h3 className="text-lg font-semibold text-red-900">Processing Failed</h3>
        <p className="mt-2 text-sm text-red-700">
          {errorMessage ?? 'An error occurred during processing.'}
        </p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="mt-4 rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
          >
            Retry
          </button>
        )}
      </div>
    );
  }

  const currentIndex = STEPS.findIndex((s) => s.key === displayStatus);

  return (
    <div className="rounded-lg border border-blue-200 bg-blue-50 p-6" aria-live="polite" role="status">
      <h3 className="text-lg font-semibold text-blue-900">Processing Your Workout</h3>
      <div className="mt-4 space-y-3">
        {STEPS.map((step, index) => {
          const isActive = index === currentIndex;
          const isComplete = index < currentIndex;

          return (
            <div key={step.key} className="flex items-center gap-3">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium ${
                  isComplete
                    ? 'bg-green-500 text-white'
                    : isActive
                      ? 'animate-pulse bg-blue-500 text-white'
                      : 'bg-gray-200 text-gray-400'
                }`}
              >
                {isComplete ? '✓' : index + 1}
              </div>
              <span
                className={`text-sm ${
                  isActive ? 'font-medium text-blue-900' : 'text-gray-600'
                }`}
              >
                {step.label}
              </span>
            </div>
          );
        })}
      </div>

      {progressiveSteps.length > 0 && (
        <div className="mt-5 border-t border-blue-200 pt-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-blue-800">
            Results arriving
          </p>
          <ul className="space-y-2">
            {progressiveSteps.map((step) => (
              <li key={step.key} className="flex items-center gap-2 text-sm">
                <span
                  className={
                    step.ready
                      ? 'text-green-600 dark:text-green-400'
                      : 'text-gray-400 dark:text-gray-500'
                  }
                  aria-hidden
                >
                  {step.ready ? '✓' : '…'}
                </span>
                <span className={step.ready ? 'text-gray-800 dark:text-gray-200' : 'text-gray-500'}>
                  {step.label}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
