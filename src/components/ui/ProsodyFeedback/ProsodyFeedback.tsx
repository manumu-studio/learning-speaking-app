// ProsodyFeedback — per-word intonation/break indicators and overall prosody score gauge
'use client';

import React from 'react';
import { mapAzureScoreToDisplay } from '@/components/ui/PronunciationSection';
import type { ProsodyFeedbackProps } from './ProsodyFeedback.types';
import { useProsodyFeedback } from './useProsodyFeedback';

export function ProsodyFeedback({
  words,
  prosodyScore,
  animationDelay,
}: ProsodyFeedbackProps): React.JSX.Element {
  const { wordIndicators, wordsWithIssues, hasMonotonePattern } =
    useProsodyFeedback(words);

  const displayScore = mapAzureScoreToDisplay(prosodyScore);

  return (
    <section
      className="opacity-0 rounded-xl border border-violet-200 bg-violet-50/50 p-5 space-y-4 dark:border-violet-800 dark:bg-violet-950/20"
      style={{
        animation: 'fadeInUp 0.5s ease-out forwards',
        animationDelay: `${animationDelay}ms`,
      }}
      aria-labelledby="prosody-feedback-heading"
    >
      <div className="flex items-center justify-between gap-4">
        <h3
          id="prosody-feedback-heading"
          className="text-sm font-semibold uppercase tracking-wide text-violet-900 dark:text-violet-200"
        >
          Prosody Feedback
        </h3>
        <div className="flex flex-col items-end">
          <span className="text-2xl font-bold text-violet-700 dark:text-violet-300">
            {displayScore}
          </span>
          <span className="text-xs text-violet-600 dark:text-violet-400">/10 prosody</span>
        </div>
      </div>

      {hasMonotonePattern && (
        <p className="rounded-lg bg-blue-50 px-3 py-2 text-sm text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
          Some words sound monotone — try varying pitch on stressed syllables for more natural
          English rhythm.
        </p>
      )}

      <div
        className="flex flex-wrap gap-x-4 gap-y-2 rounded-lg border border-violet-200 bg-white/60 px-3 py-2 text-xs text-violet-800 dark:border-violet-700 dark:bg-violet-950/30 dark:text-violet-200"
        aria-label="Prosody indicator legend"
      >
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-4 border-b border-dashed border-orange-500" aria-hidden />
          Pause / break issue
        </span>
        <span className="flex items-center gap-1.5">
          <span className="text-amber-600 dark:text-amber-400" aria-hidden>
            ↕
          </span>
          Intonation issue
        </span>
        <span className="flex items-center gap-1.5">
          <span className="text-blue-500" aria-hidden>
            ~
          </span>
          Monotone pitch
        </span>
      </div>

      <div className="flex flex-wrap gap-x-1 gap-y-2" aria-label="Word prosody indicators">
        {wordIndicators.map((item) => {
          const hasIssue =
            item.hasIntonationIssue || item.hasBreakIssue || item.isMonotone;
          const ariaLabel = [
            item.word,
            item.hasBreakIssue ? 'pause or break issue' : null,
            item.hasIntonationIssue ? 'intonation issue' : null,
            item.isMonotone ? 'monotone pitch' : null,
          ]
            .filter(Boolean)
            .join(', ');

          return (
            <span
              key={`${item.word}-${item.index}`}
              aria-label={ariaLabel}
              className={[
                'relative inline-block rounded px-1 py-0.5 text-base font-medium',
                hasIssue
                  ? 'text-violet-900 dark:text-violet-100'
                  : 'text-gray-700 dark:text-gray-300',
              ].join(' ')}
            >
              {item.word}
              {item.hasIntonationIssue && (
                <span
                  className="absolute -top-1 -right-0.5 text-[10px] text-amber-600 dark:text-amber-400"
                  aria-hidden
                >
                  ↕
                </span>
              )}
              {item.hasBreakIssue && (
                <span
                  className="absolute -bottom-1 left-0 right-0 border-b border-dashed border-orange-500"
                  aria-hidden
                />
              )}
              {item.isMonotone && !item.hasIntonationIssue && (
                <span
                  className="absolute -top-1 -right-0.5 text-[10px] text-blue-500"
                  aria-hidden
                >
                  ~
                </span>
              )}
            </span>
          );
        })}
      </div>

      {wordsWithIssues.length === 0 && (
        <p className="text-sm text-green-700 dark:text-green-400">
          No significant prosody issues detected on individual words.
        </p>
      )}
    </section>
  );
}
