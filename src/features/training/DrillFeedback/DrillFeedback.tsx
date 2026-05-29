// DrillFeedback — displays micro-feedback with improved badge and action buttons
'use client';

import type { DrillFeedbackProps } from './DrillFeedback.types';

export function DrillFeedback({
  feedback,
  improved,
  onTryAgain,
  onBackToResults,
  onGoToDashboard,
  className,
}: DrillFeedbackProps) {
  return (
    <div className={`rounded-xl border border-zinc-700 bg-zinc-800/50 p-6 ${className ?? ''}`}>
      <div className="mb-4">
        {improved ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-sm font-medium text-emerald-400">
            ✅ Improved
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-3 py-1 text-sm font-medium text-amber-400">
            🔄 Keep practicing
          </span>
        )}
      </div>

      <div aria-live="polite" role="status" aria-atomic="true">
        <p className="mb-6 text-lg leading-relaxed text-zinc-100">{feedback}</p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          onClick={onTryAgain}
          className="rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-indigo-500"
        >
          Go Again
        </button>
        <button
          type="button"
          onClick={onBackToResults}
          className="rounded-lg border border-zinc-600 px-4 py-2.5 text-sm font-medium text-zinc-300 transition-colors hover:bg-zinc-700"
        >
          Back to Results
        </button>
        <button
          type="button"
          onClick={onGoToDashboard}
          className="rounded-lg border border-zinc-600 px-4 py-2.5 text-sm font-medium text-zinc-300 transition-colors hover:bg-zinc-700"
        >
          Go to Dashboard
        </button>
      </div>
    </div>
  );
}
