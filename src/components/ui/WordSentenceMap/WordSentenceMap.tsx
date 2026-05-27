// WordSentenceMap: renders the pronunciation transcript inline with underlined problem words and tooltips
'use client';

import React, { useRef, useEffect } from 'react';
import type { WordSentenceMapProps } from './WordSentenceMap.types';
import { useWordSentenceMap } from './useWordSentenceMap';

const UNDERLINE_CLASSES: Record<'none' | 'amber' | 'red', string> = {
  none: '',
  amber:
    'underline decoration-amber-400 decoration-2 underline-offset-2 cursor-pointer hover:decoration-amber-600',
  red:
    'underline decoration-red-500 decoration-2 underline-offset-2 cursor-pointer hover:decoration-red-700',
} as const;

function tooltipPositionClass(index: number): string {
  return index < 2 ? 'left-0 translate-x-0' : 'left-1/2 -translate-x-1/2';
}

export function WordSentenceMap({
  words,
  animationDelay,
}: WordSentenceMapProps): React.JSX.Element {
  const { annotatedWords, openIndex, openTooltip, closeTooltip } = useWordSentenceMap(words);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        event.target instanceof Node &&
        !containerRef.current.contains(event.target)
      ) {
        closeTooltip();
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [closeTooltip]);

  return (
    <section
      ref={containerRef}
      className="opacity-0"
      style={{
        animation: 'fadeInUp 0.5s ease-out forwards',
        animationDelay: `${animationDelay}ms`,
      }}
      aria-label="Word-by-word pronunciation map"
    >
      <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 uppercase tracking-wide">
        What you said
      </h3>

      <div className="text-base leading-loose flex flex-wrap gap-x-1 gap-y-1">
        {annotatedWords.map(({ word, underlineLevel, tooltip, index }) => {
          const isOpen = openIndex === index;
          const isInteractive = tooltip !== null;

          return (
            <span key={`${word.word}-${index}`} className="relative inline-block">
              {isInteractive ? (
                <button
                  type="button"
                  onClick={() => openTooltip(index)}
                  aria-expanded={isOpen}
                  aria-describedby={isOpen ? `tooltip-${index}` : undefined}
                  className={[
                    'text-gray-900 dark:text-gray-100',
                    UNDERLINE_CLASSES[underlineLevel],
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded-sm',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                >
                  {word.word}
                </button>
              ) : (
                <span className="text-gray-900 dark:text-gray-100">{word.word}</span>
              )}

              {isOpen && tooltip !== null && (
                <div
                  id={`tooltip-${index}`}
                  role="tooltip"
                  className={[
                    'absolute z-10 bottom-full mb-2',
                    tooltipPositionClass(index),
                    'w-56 sm:w-64 rounded-lg shadow-lg p-3 text-left',
                    'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700',
                  ].join(' ')}
                >
                  <button
                    type="button"
                    onClick={closeTooltip}
                    aria-label="Close tip"
                    className="absolute top-2 right-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-sm leading-none"
                  >
                    &times;
                  </button>
                  <dl className="space-y-1.5 text-xs">
                    <div>
                      <dt className="font-semibold text-gray-500 dark:text-gray-400">Heard</dt>
                      <dd className="text-gray-800 dark:text-gray-200">{tooltip.detected}</dd>
                    </div>
                    <div>
                      <dt className="font-semibold text-gray-500 dark:text-gray-400">Expected</dt>
                      <dd className="text-gray-800 dark:text-gray-200">{tooltip.expected}</dd>
                    </div>
                    <div className="pt-1 border-t border-gray-100 dark:border-gray-700">
                      <dd className="text-gray-700 dark:text-gray-300 leading-snug">
                        {tooltip.tip}
                      </dd>
                    </div>
                  </dl>
                </div>
              )}
            </span>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-4 mt-4 text-xs text-gray-500 dark:text-gray-400">
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-4 border-b-2 border-amber-400" />
          Review
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-4 border-b-2 border-red-500" />
          Needs work
        </span>
      </div>
    </section>
  );
}
