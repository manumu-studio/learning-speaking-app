// ProsodyFeedback — coach-style prosody section with plain-English tips per issue
'use client';
/* eslint-disable max-lines-per-function */

import React from 'react';
import { mapAzureScoreToDisplay } from '@/components/ui/PronunciationSection';
import type { ProsodyFeedbackProps } from './ProsodyFeedback.types';
import type { ProsodyIssueType } from './ProsodyFeedback.types';
import { useProsodyFeedback } from './useProsodyFeedback';

const ISSUE_STYLE: Record<ProsodyIssueType, { icon: string; label: string; badgeClass: string }> = {
  break: {
    icon: '⏸',
    label: 'Pause',
    badgeClass: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
  },
  intonation: {
    icon: '🎵',
    label: 'Pitch',
    badgeClass: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  },
  monotone: {
    icon: '📏',
    label: 'Rhythm',
    badgeClass: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  },
};

export function ProsodyFeedback({
  words,
  prosodyScore,
  animationDelay,
}: ProsodyFeedbackProps): React.JSX.Element {
  const { topIssues, totalIssueCount, coachingSummary, hasIssues } =
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
          Rhythm & Intonation
        </h3>
        <div className="flex flex-col items-end">
          <span className="text-2xl font-bold text-violet-700 dark:text-violet-300">
            {displayScore}
          </span>
          <span className="text-xs text-violet-600 dark:text-violet-400">/10 prosody</span>
        </div>
      </div>

      {coachingSummary && (
        <p className="rounded-lg bg-violet-100/60 px-3 py-2 text-sm font-medium text-violet-900 dark:bg-violet-900/30 dark:text-violet-200">
          {coachingSummary}
        </p>
      )}

      {hasIssues && (
        <ul className="space-y-2" aria-label="Prosody coaching tips">
          {topIssues.map((issue) => {
            const style = ISSUE_STYLE[issue.type];
            return (
              <li
                key={`${issue.word}-${issue.index}`}
                className="flex items-start gap-3 rounded-lg border border-violet-100 bg-white/60 px-3 py-2.5 dark:border-violet-800 dark:bg-violet-950/30"
              >
                <span
                  className={[
                    'inline-flex items-center gap-1 shrink-0 rounded-full px-2 py-0.5 text-xs font-medium',
                    style.badgeClass,
                  ].join(' ')}
                  aria-label={`${style.label} issue`}
                >
                  <span aria-hidden>{style.icon}</span>
                  {style.label}
                </span>
                <div className="flex flex-col gap-0.5 min-w-0">
                  <span className="text-sm font-semibold text-violet-900 dark:text-violet-100">
                    &ldquo;{issue.word}&rdquo;
                  </span>
                  <span className="text-xs text-gray-600 dark:text-gray-400">
                    {issue.tip}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {totalIssueCount > topIssues.length && (
        <p className="text-xs text-violet-600 dark:text-violet-400">
          + {totalIssueCount - topIssues.length} more minor issues not shown
        </p>
      )}

      {!hasIssues && (
        <p className="text-sm text-green-700 dark:text-green-400">
          Your rhythm and intonation sound natural — keep it up!
        </p>
      )}
    </section>
  );
}
