// ProsodyPanel: session-level prosody summary (speaking rate, rhythm, top stress/intonation errors)
'use client';

import React from 'react';
import { ScoreChip } from '@/components/ui/ScoreChip';
import { mapAzureScoreToDisplay } from '@/components/ui/PronunciationSection';
import type { ProsodyPanelProps, RateStatus, TopProsodyIssuesListProps } from './ProsodyPanel.types';
import { useProsodyPanel } from './useProsodyPanel';

const RATE_CHIP_CONFIG: Record<RateStatus, { score: number; label: string }> = {
  ideal: { score: 9, label: 'Ideal pace' },
  'too-fast': { score: 6, label: 'A bit fast' },
  'too-slow': { score: 6, label: 'A bit slow' },
} as const;

// Alert banner shown when syllable-timed rhythm is detected
function SyllableTimedRhythmAlert() {
  return (
    <div className="flex gap-2 p-3 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg">
      <span className="text-orange-500 text-base leading-tight" aria-hidden>
        &#9651;
      </span>
      <div>
        <p className="text-sm font-medium text-orange-800 dark:text-orange-300">
          Syllable-timed rhythm detected
        </p>
        <p className="text-xs text-orange-700 dark:text-orange-400 mt-0.5">
          English uses stress-timing: stressed syllables fall at regular intervals.
          Spanish is syllable-timed, giving each syllable equal weight.
          Focus on stretching stressed vowels and reducing unstressed ones.
        </p>
      </div>
    </div>
  );
}

// Ranked list of prosody error types with frequency counts
function TopProsodyIssuesList({ topErrors }: TopProsodyIssuesListProps) {
  return (
    <div>
      <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2 uppercase tracking-wide">
        Top prosody issues
      </p>
      <ul className="space-y-1.5">
        {topErrors.map(({ type, count }) => (
          <li
            key={type}
            className="flex items-center justify-between text-sm text-gray-700 dark:text-gray-300"
          >
            <span>{type}</span>
            <span className="text-xs text-gray-400 dark:text-gray-500 tabular-nums">{count}x</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function ProsodyPanel({
  words,
  speakingRateWpm,
  prosodyScore,
  animationDelay,
}: ProsodyPanelProps): React.JSX.Element {
  const { rateStatus, hasSyllableTimedRhythm, topErrors, isMonotone } =
    useProsodyPanel(words, speakingRateWpm);

  const rateChip = RATE_CHIP_CONFIG[rateStatus];
  const displayProsodyScore = mapAzureScoreToDisplay(prosodyScore);

  const noIssues = !hasSyllableTimedRhythm && topErrors.length === 0 && !isMonotone;

  return (
    <section
      className="opacity-0 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl p-5 space-y-5"
      style={{
        animation: 'fadeInUp 0.5s ease-out forwards',
        animationDelay: `${animationDelay}ms`,
      }}
      aria-labelledby="prosody-panel-heading"
    >
      <div className="flex items-center justify-between">
        <h3
          id="prosody-panel-heading"
          className="text-sm font-semibold text-gray-800 dark:text-gray-200 uppercase tracking-wide"
        >
          Prosody &amp; Rhythm
        </h3>
        <span className="text-xs text-gray-500 dark:text-gray-400">
          Prosody score: {displayProsodyScore}/10
        </span>
      </div>

      <div>
        <p className="mb-1 text-xs font-medium uppercase tracking-wide text-gray-600 dark:text-gray-400">
          Speaking rate
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <ScoreChip score={rateChip.score} scale="ten" label={rateChip.label} />
        </div>
      </div>

      {hasSyllableTimedRhythm && <SyllableTimedRhythmAlert />}

      {topErrors.length > 0 && <TopProsodyIssuesList topErrors={topErrors} />}

      {isMonotone && (
        <p className="text-sm text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 rounded-lg px-3 py-2">
          Consider varying your pitch more. A flatter pitch can sound monotone to native
          English listeners, even when pronunciation is accurate.
        </p>
      )}

      {noIssues && (
        <p className="text-sm text-green-700 dark:text-green-400">
          No significant prosody issues detected. Good rhythm and intonation.
        </p>
      )}
    </section>
  );
}
