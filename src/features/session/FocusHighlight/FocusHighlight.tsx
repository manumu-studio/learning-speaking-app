// Displays focus metric comparison on session results page
'use client';

import { FocusHighlightProps } from './FocusHighlight.types';

export function FocusHighlight({
  metricLabel,
  currentScore,
  previousScore,
  animationDelay = 0,
}: FocusHighlightProps) {
  const improved = previousScore !== null && currentScore > previousScore;

  return (
    <div
      className="rounded-lg border border-blue-100 bg-blue-50/50 p-4 dark:border-blue-900 dark:bg-blue-950/30 animate-fadeIn"
      style={{ animationDelay: `${animationDelay}ms` }}
    >
      <h3 className="text-sm font-medium text-blue-800 dark:text-blue-300">
        🎯 Focus Area: {metricLabel}
      </h3>
      <div className="mt-2 flex items-baseline gap-2">
        <span className="text-2xl font-bold text-slate-900 dark:text-slate-100">
          {currentScore}/10
        </span>
        {previousScore !== null && (
          <span
            className={`text-sm font-medium ${
              improved
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            {improved ? '↑' : '→'} from {previousScore} last session
          </span>
        )}
        {previousScore === null && (
          <span className="text-sm text-slate-500 dark:text-slate-400">
            First session with this focus
          </span>
        )}
      </div>
    </div>
  );
}
