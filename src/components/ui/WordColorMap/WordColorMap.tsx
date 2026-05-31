// WordColorMap: renders the pronunciation transcript as clickable color-coded word spans
'use client';

import React from 'react';
import { PhonemeDetail } from '@/components/ui/PhonemeDetail';
import type { WordColorMapProps } from './WordColorMap.types';
import type { WordColor } from './WordColorMap.types';
import { useWordColorMap } from './useWordColorMap';

const COLOR_CLASSES: Record<WordColor, string> = {
  green: 'text-green-700 dark:text-green-400',
  yellow: 'text-yellow-600 dark:text-yellow-400',
  amber: 'text-rose-600 dark:text-rose-400',
  'gray-italic': 'text-gray-500 italic dark:text-gray-400',
} as const;

export function WordColorMap({
  words,
  animationDelay,
}: WordColorMapProps): React.JSX.Element {
  const { coloredWords, expandedIndex, toggleWord, closeExpanded } =
    useWordColorMap(words);

  return (
    <section
      className="opacity-0"
      style={{
        animation: 'fadeInUp 0.5s ease-out forwards',
        animationDelay: `${animationDelay}ms`,
      }}
      aria-label="Word-by-word pronunciation map"
    >
      <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 uppercase tracking-wide">
        Word Map
      </h3>

      <div className="flex flex-wrap gap-x-1.5 gap-y-2">
        {coloredWords.map(({ word, color, index }) => {
          const isExpanded = expandedIndex === index;
          const isOmission = word.errorType === 'Omission';

          return (
            <React.Fragment key={`${word.word}-${index}`}>
              <button
                type="button"
                onClick={() => toggleWord(index)}
                aria-expanded={isExpanded}
                aria-label={`${word.word}: accuracy ${word.accuracyScore}%. Click to ${isExpanded ? 'collapse' : 'expand'} phoneme detail.`}
                className={[
                  'text-base font-medium px-1 py-0.5 rounded transition-colors',
                  'hover:bg-gray-100 dark:hover:bg-gray-800',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1',
                  'focus-visible:ring-blue-500 dark:focus-visible:ring-blue-400',
                  isExpanded ? 'bg-gray-100 dark:bg-gray-800' : '',
                  COLOR_CLASSES[color],
                ]
                  .filter(Boolean)
                  .join(' ')}
              >
                {isOmission ? (
                  <span className="line-through text-gray-400 dark:text-gray-500">
                    [{word.word}]
                  </span>
                ) : (
                  word.word
                )}
              </button>

              {isExpanded && (
                <div className="w-full mt-1 mb-2">
                  <PhonemeDetail word={word} onClose={closeExpanded} />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>

      <div className="mt-4 flex flex-wrap gap-4 text-xs text-gray-500 dark:text-gray-400">
        <span className="flex items-center gap-1">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-green-400" />
          Clear
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-yellow-400" />
          Accented
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-rose-400" />
          Needs work
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-gray-500" />
          Inserted
        </span>
      </div>
    </section>
  );
}
