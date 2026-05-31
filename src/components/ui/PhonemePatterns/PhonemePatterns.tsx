// Displays weak phonemes the user struggles with — collapsible list with IPA symbols and score chips
'use client';

import { ScoreChip } from '@/components/ui/ScoreChip';
import { usePhonemePatterns } from './usePhonemePatterns';
import type { PhonemePatternsProps } from './PhonemePatterns.types';

export function PhonemePatterns({ phonemes, animationDelay = 0 }: PhonemePatternsProps) {
  const { isExpanded, toggle } = usePhonemePatterns();

  if (phonemes.length === 0) return null;

  return (
    <div
      className="rounded-xl border border-amber-200/30 bg-amber-50/50 p-4 dark:border-amber-700/30 dark:bg-amber-950/20"
      style={{ animationDelay: `${animationDelay}ms` }}
    >
      <button
        type="button"
        onClick={toggle}
        aria-expanded={isExpanded}
        className="flex w-full items-center justify-between text-left"
      >
        <h4 className="text-sm font-semibold text-amber-900 dark:text-amber-200">
          Sounds to Practice ({phonemes.length})
        </h4>
        <svg
          className={`h-4 w-4 text-amber-600 transition-transform dark:text-amber-400 ${isExpanded ? 'rotate-180' : ''}`}
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
          {phonemes.map((ph) => (
            <li
              key={ph.phoneme}
              className="flex items-center justify-between rounded-lg bg-white/60 px-3 py-2 dark:bg-white/5"
            >
              <div className="flex items-center gap-3">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-amber-100 font-mono text-base font-bold text-amber-800 dark:bg-amber-900/40 dark:text-amber-200">
                  {ph.ipaSymbol}
                </span>
                <div>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    /{ph.phoneme}/
                  </span>
                  <p className="text-xs text-gray-600 dark:text-gray-300">
                    {ph.exampleWords.join(', ')}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400">{ph.occurrences}×</span>
                <ScoreChip score={ph.averageScore} scale="hundred" />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
