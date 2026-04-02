// FocusSelector — sticky bottom banner displaying current training focus
'use client';

import type { FocusSelectorProps } from './FocusSelector.types';

export function FocusSelector({ focusLabel, onClear }: FocusSelectorProps) {
  if (focusLabel === null) return null;

  return (
    <div
      className={`
        fixed bottom-0 left-0 right-0 z-40
        border-t border-blue-200 bg-blue-50 px-4 py-3
        dark:border-blue-800 dark:bg-blue-950
        transition-transform duration-300 ease-out
        ${focusLabel ? 'translate-y-0' : 'translate-y-full'}
      `}
    >
      <div className="mx-auto flex max-w-3xl items-center justify-between">
        <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
          Today&apos;s Training Focus:{' '}
          <span className="font-semibold">{focusLabel}</span>
        </p>
        <button
          type="button"
          onClick={onClear}
          className="
            rounded-lg px-3 py-1 text-sm font-medium text-blue-600
            hover:bg-blue-100 transition-colors duration-150
            dark:text-blue-400 dark:hover:bg-blue-900
          "
          aria-label="Clear training focus"
        >
          Clear
        </button>
      </div>
    </div>
  );
}
