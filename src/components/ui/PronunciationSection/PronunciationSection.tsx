// PronunciationSection: top-level container showing score gauges and speaking rate for a pronunciation report
'use client';

import React from 'react';
import type { PronunciationSectionProps, WpmStatus } from './PronunciationSection.types';
import { mapAzureScoreToDisplay } from './usePronunciationSection';

export function PronunciationSection({
  pronunciationReport,
  animationDelay,
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

      <div className="flex flex-wrap gap-4 mb-6" role="list" aria-label="Pronunciation scores">
        {gauges.map(({ label, azureScore }) => {
          const displayScore = mapAzureScoreToDisplay(azureScore);
          return (
            <div
              key={label}
              role="listitem"
              className="flex flex-col items-center gap-1 min-w-[72px]"
            >
              <div
                className="relative flex items-center justify-center w-16 h-16 rounded-full border-4"
                style={{
                  borderColor: scoreToColor(azureScore),
                }}
                aria-label={`${label}: ${displayScore} out of 10`}
              >
                <span className="text-lg font-bold text-gray-900 dark:text-gray-100">
                  {displayScore}
                </span>
                <span className="absolute bottom-0.5 text-[9px] text-gray-500 dark:text-gray-400">
                  /10
                </span>
              </div>
              <span className="text-xs text-gray-600 dark:text-gray-400 text-center leading-tight">
                {label}
              </span>
            </div>
          );
        })}
      </div>

      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-600 dark:text-gray-400">Speaking rate:</span>
        <span className={`text-sm font-medium px-2 py-0.5 rounded-full ${wpmColorClass}`}>
          {speakingRateWpm} words/min
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

function scoreToColor(azureScore: number): string {
  if (azureScore >= 80) return '#22c55e';
  if (azureScore >= 60) return '#eab308';
  return '#ef4444';
}
