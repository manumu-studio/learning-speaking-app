// AccentPolish: low-functional-load pronunciation items shown as optional, collapsed refinements.
// These rarely affect understanding (Levis 2005), so they're de-emphasised vs Priority Sounds.
'use client';

import type { RankedFLError } from '@/lib/pronunciation/functionalLoad.types';
import { useAccentPolish } from './useAccentPolish';
import type { AccentPolishProps } from './AccentPolish.types';

function PolishRow({ error }: { error: RankedFLError }) {
  return (
    <li className="flex items-start justify-between gap-3 rounded-lg bg-white/50 px-3 py-2 dark:bg-white/5">
      <div className="min-w-0">
        <span className="font-mono text-sm font-medium text-gray-700 dark:text-gray-200">
          {error.label}
        </span>
        <p className="mt-0.5 text-xs leading-relaxed text-gray-500 dark:text-gray-400">{error.rule}</p>
      </div>
      <div className="flex flex-wrap justify-end gap-1">
        {error.examples.slice(0, 2).map((ex) => (
          <span key={ex.word} className="font-mono text-xs text-gray-400 dark:text-gray-500">
            {ex.ipa}
          </span>
        ))}
      </div>
    </li>
  );
}

export function AccentPolish({ errors, animationDelay = 0 }: AccentPolishProps) {
  const { isExpanded, toggle } = useAccentPolish();
  if (errors.length === 0) return null;

  return (
    <div
      className="rounded-xl border border-gray-200/50 bg-gray-50/40 p-4 dark:border-gray-700/40 dark:bg-gray-900/20"
      style={{ animationDelay: `${animationDelay}ms` }}
    >
      <button
        type="button"
        onClick={toggle}
        aria-expanded={isExpanded}
        className="flex w-full items-center justify-between text-left"
      >
        <span>
          <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
            Accent Polish ({errors.length})
          </span>
          <span className="ml-2 text-xs text-gray-400 dark:text-gray-500">
            Optional — rarely affects understanding
          </span>
        </span>
        <svg
          className={`h-4 w-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isExpanded && (
        <ul className="mt-3 space-y-2">
          {errors.map((error) => (
            <PolishRow key={error.id} error={error} />
          ))}
        </ul>
      )}
    </div>
  );
}
