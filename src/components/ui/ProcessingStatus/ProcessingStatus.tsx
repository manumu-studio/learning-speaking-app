'use client';
// Displays current processing step with animated visual indicator
import { ProcessingStatusProps } from './ProcessingStatus.types';

const STEPS = [
  { key: 'UPLOADED', label: 'Uploaded' },
  { key: 'TRANSCRIBING', label: 'Transcribing your speech...' },
  { key: 'ANALYZING', label: 'Analyzing patterns...' },
  { key: 'DONE', label: 'Done!' },
] as const;

export function ProcessingStatus({ status, errorMessage, onRetry }: ProcessingStatusProps) {
  if (status === 'FAILED') {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6">
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

  const currentIndex = STEPS.findIndex((s) => s.key === status);

  return (
    <div className="rounded-lg border border-blue-200 bg-blue-50 p-6">
      <h3 className="text-lg font-semibold text-blue-900">Processing Your Session</h3>
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
    </div>
  );
}
