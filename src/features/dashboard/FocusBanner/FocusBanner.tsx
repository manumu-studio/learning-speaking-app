// Displays the user's current training focus as a subtle banner
'use client';

import { FocusBannerProps } from './FocusBanner.types';

export function FocusBanner({ focusLabel, className }: FocusBannerProps) {
  return (
    <div
      className={`
        flex items-center gap-2 rounded-lg border border-slate-200
        bg-slate-50 px-4 py-2.5 text-sm text-slate-700
        dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-300
        ${className ?? ''}
      `.trim()}
      role="status"
      aria-live="polite"
      aria-label={`Today's focus: ${focusLabel}`}
    >
      <span className="text-blue-500" aria-hidden="true">
        🎯
      </span>
      <span>
        Today&apos;s Focus:{' '}
        <strong className="font-semibold text-slate-900 dark:text-slate-100">
          {focusLabel}
        </strong>
      </span>
    </div>
  );
}
