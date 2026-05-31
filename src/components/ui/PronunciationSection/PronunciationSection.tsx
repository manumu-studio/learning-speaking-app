// PronunciationSection: top-level container showing score tier badges and speaking rate for a pronunciation report
'use client';

import React from 'react';
import type { PronunciationSectionProps, WpmStatus } from './PronunciationSection.types';
import { ScoreTierBadge } from '@/components/ui/ScoreTierBadge';

export function PronunciationSection({
  pronunciationReport,
  animationDelay,
  progressChip,
}: PronunciationSectionProps): React.JSX.Element {
  const {
    pronScore,
    accuracyScore,
    fluencyScore,
    completenessScore,
    prosodyScore,
    speakingRateWpm,
    failureReason,
  } = pronunciationReport;

  const gauges = [
    { label: 'Overall', azureScore: pronScore },
    { label: 'Accuracy', azureScore: accuracyScore },
    { label: 'Fluency', azureScore: fluencyScore },
    { label: 'Completeness', azureScore: completenessScore },
    { label: 'Prosody', azureScore: prosodyScore },
  ] as const;

  const wpmStatus: WpmStatus =
    speakingRateWpm >= 110 && speakingRateWpm <= 140 ? 'ideal' : 'outside-ideal';

  const wpmColorClass =
    wpmStatus === 'ideal'
      ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
      : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300';

  return (
    <section
      className="opacity-0"
      style={{
        animation: 'fadeInUp 0.5s ease-out forwards',
        animationDelay: `${animationDelay}ms`,
      }}
      aria-labelledby="pronunciation-section-heading"
    >
      <h2
        id="pronunciation-section-heading"
        className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4"
      >
        Pronunciation &amp; Intonation
      </h2>

      {failureReason !== null && (
        <p
          role="status"
          className="mb-4 text-sm text-yellow-700 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20 rounded-md px-3 py-2"
        >
          Pronunciation analysis partial: {failureReason}
        </p>
      )}

      <div className="flex flex-wrap gap-2 sm:gap-3 mb-4" role="list" aria-label="Pronunciation scores">
        {gauges.map(({ label, azureScore }) => (
          <div key={label} role="listitem">
            <ScoreTierBadge azureScore={azureScore} label={label} />
          </div>
        ))}
      </div>

      {progressChip !== undefined && progressChip.deltaPercent !== null && (
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
          {progressChip.metricLabel}{' '}
          <span
            className={
              progressChip.deltaPercent >= 0
                ? 'text-green-600 dark:text-green-400 font-medium'
                : 'text-amber-600 dark:text-amber-400 font-medium'
            }
          >
            {progressChip.deltaPercent >= 0 ? '+' : ''}
            {progressChip.deltaPercent}% vs last session
          </span>
        </p>
      )}

      <details className="mt-2">
        <summary className="cursor-pointer text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 select-none">
          Score details
        </summary>
        <div className="flex flex-wrap gap-2 sm:gap-3 mt-3" role="list" aria-label="Numeric pronunciation scores">
          {gauges.map(({ label, azureScore }) => (
            <div key={label} role="listitem">
              <ScoreTierBadge azureScore={azureScore} label={label} showNumeric />
            </div>
          ))}
        </div>
      </details>

      <div className="flex items-center gap-2 mt-6">
        <span className="text-sm text-gray-600 dark:text-gray-400">Speaking rate:</span>
        <span className={`text-sm font-medium px-2 py-0.5 rounded-full ${wpmColorClass}`}>
          {Math.round(speakingRateWpm)} words/min
        </span>
        {wpmStatus === 'ideal' && (
          <span className="text-xs text-gray-500 dark:text-gray-400">(ideal range)</span>
        )}
        {wpmStatus === 'outside-ideal' && (
          <span className="text-xs text-gray-500 dark:text-gray-400">
            (ideal: 110-140 wpm)
          </span>
        )}
      </div>
    </section>
  );
}
