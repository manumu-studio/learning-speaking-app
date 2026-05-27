// PronunciationTipsCard: shows 2-3 Claude-generated actionable coaching tips for pronunciation
'use client';

import React from 'react';
import type { PronunciationTipsCardProps } from './PronunciationTipsCard.types';
import { usePronunciationTipsCard } from './usePronunciationTipsCard';

export function PronunciationTipsCard({
  pronunciationReport,
  animationDelay,
}: PronunciationTipsCardProps): React.JSX.Element {
  const state = usePronunciationTipsCard(pronunciationReport);

  return (
    <section
      className="opacity-0 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-5 space-y-4"
      style={{
        animation: 'fadeInUp 0.5s ease-out forwards',
        animationDelay: `${animationDelay}ms`,
      }}
      aria-labelledby="tips-card-heading"
      aria-live="polite"
    >
      <h3
        id="tips-card-heading"
        className="text-sm font-semibold text-blue-900 dark:text-blue-200 uppercase tracking-wide"
      >
        Coaching tips
      </h3>

      {state.status === 'loading' && (
        <div className="flex items-center gap-2 text-sm text-blue-700 dark:text-blue-400">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-400 border-t-transparent" />
          Generating tips...
        </div>
      )}

      {state.status === 'error' && (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Could not generate tips right now. Try reloading.
        </p>
      )}

      {state.status === 'done' && state.tips.length === 0 && (
        <p className="text-sm text-blue-800 dark:text-blue-300">
          Great pronunciation overall! Keep practising to maintain your accuracy.
        </p>
      )}

      {state.status === 'done' && state.tips.length > 0 && (
        <ol className="space-y-3 list-none">
          {state.tips.map((tip, i) => (
            <li key={i} className="flex items-start gap-3">
              <span
                className="flex-shrink-0 flex items-center justify-center w-6 h-6 rounded-full bg-blue-200 dark:bg-blue-800 text-blue-800 dark:text-blue-200 text-xs font-bold"
                aria-hidden
              >
                {i + 1}
              </span>
              <div>
                <p className="text-sm font-semibold text-blue-900 dark:text-blue-200">{tip.focus}</p>
                <p className="text-sm text-blue-800 dark:text-blue-300 mt-0.5 leading-snug">
                  {tip.instruction}
                </p>
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
