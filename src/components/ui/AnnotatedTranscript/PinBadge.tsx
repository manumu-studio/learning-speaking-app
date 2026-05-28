// PinBadge: inline metric pin badge with expandable coaching tooltip
// Internal component — not exported from AnnotatedTranscript/index.ts
'use client';

import React from 'react';
import type { PinBadgeProps } from './PinBadge.types';
import type { PinVariant } from '@/lib/text/annotationTypes';

const VARIANT_CLASSES: Record<PinVariant, string> = {
  strength:
    'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800',
  building:
    'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800',
  sharpen:
    'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 border-gray-200 dark:border-gray-700',
} as const;

const TOOLTIP_ACCENT: Record<PinVariant, string> = {
  strength: 'border-l-green-400 dark:border-l-green-600',
  building: 'border-l-amber-400 dark:border-l-amber-600',
  sharpen: 'border-l-gray-400 dark:border-l-gray-600',
} as const;

const CATEGORY_ICONS: Record<string, string> = {
  filler: '…',
  connector: '↻',
  structure: '¶',
  vocabulary: 'V',
  verb: 'V',
  grammar: 'V',
  closure: '◉',
} as const;

function getCategoryIcon(category: string): string {
  return CATEGORY_ICONS[category.toLowerCase()] ?? '!';
}

export function PinBadge({ annotation }: PinBadgeProps): React.JSX.Element {
  const [isOpen, setIsOpen] = React.useState(false);
  const { pinVariant, category, pattern, suggestion } = annotation;

  const icon = getCategoryIcon(category);
  const variantClass = VARIANT_CLASSES[pinVariant];
  const tooltipAccent = TOOLTIP_ACCENT[pinVariant];

  return (
    <span className="relative inline-block mx-1 align-middle">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-label={`${category} note: ${pattern}`}
        className={`
          inline-flex items-center gap-0.5 px-1.5 py-0.5
          rounded-full text-[10px] font-semibold
          border transition-all duration-150
          hover:opacity-80 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-indigo-400
          ${variantClass}
        `}
      >
        <span aria-hidden="true">{icon}</span>
        <span aria-hidden="true">📌</span>
      </button>

      {isOpen && (
        <span
          className={`
            absolute z-10 top-full left-0 mt-1 w-56
            bg-white dark:bg-gray-900
            border border-gray-200 dark:border-gray-700
            border-l-4 ${tooltipAccent}
            rounded-lg shadow-lg p-3
            text-left
          `}
          role="tooltip"
        >
          <span className="block text-xs font-semibold text-gray-800 dark:text-gray-100 mb-1">
            {pattern}
          </span>
          {suggestion !== null && (
            <span className="block text-xs text-gray-600 dark:text-gray-400">
              💡 {suggestion}
            </span>
          )}
          <span className="block text-[10px] text-gray-400 dark:text-gray-500 mt-1 uppercase tracking-wide">
            {category}
          </span>
        </span>
      )}
    </span>
  );
}
