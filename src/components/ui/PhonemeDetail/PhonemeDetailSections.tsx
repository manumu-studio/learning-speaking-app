// Private sub-section components for PhonemeDetail — phonemes list, L1 tags, prosody
'use client';

import React from 'react';
import { ScoreChip } from '@/components/ui/ScoreChip';
import { L1_TAG_LABELS } from './PhonemeDetail.types';
import { phonemeScoreToColorClass } from './usePhonemeDetail';
import type {
  PhonemesListProps,
  L1TagsSectionProps,
  ProsodicFeedbackSectionProps,
} from './PhonemeDetailSections.types';

// ─── Phonemes list ─────────────────────────────────────────────────────────────

export function PhonemesList({ phonemes, displayPhoneme }: PhonemesListProps) {
  return (
    <div>
      <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2 uppercase tracking-wide">
        Phonemes
      </p>
      <div className="space-y-2">
        {phonemes.map((phoneme, i) => {
          const topAlternative = phoneme.nBest?.[0];
          const showAlternative =
            topAlternative !== undefined && topAlternative.phoneme !== phoneme.phoneme;

          return (
            <div key={`${phoneme.phoneme}-${i}`}>
              <div className="flex items-center gap-2">
                <span className="text-sm font-mono w-8 text-gray-700 dark:text-gray-300">
                  /{displayPhoneme(phoneme.phoneme)}/
                </span>
                <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${phonemeScoreToColorClass(phoneme.accuracyScore)}`}
                    style={{ width: `${phoneme.accuracyScore}%` }}
                    role="meter"
                    aria-valuenow={phoneme.accuracyScore}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={`/${displayPhoneme(phoneme.phoneme)}/ accuracy`}
                  />
                </div>
                <span className="text-xs text-gray-500 dark:text-gray-400 w-8 text-right">
                  {phoneme.accuracyScore}%
                </span>
                <ScoreChip score={phoneme.accuracyScore} scale="hundred" />
              </div>
              {showAlternative && (
                <p className="ml-10 mt-0.5 text-xs text-amber-600 dark:text-amber-400">
                  You said: /{displayPhoneme(topAlternative.phoneme)}/ &nbsp;&rarr;&nbsp; Expected: /
                  {displayPhoneme(phoneme.phoneme)}/
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── L1 tags + bridge feedback ────────────────────────────────────────────────

export function L1TagsSection({ knownL1Tags, bridgeFeedback }: L1TagsSectionProps) {
  return (
    <div>
      <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2 uppercase tracking-wide">
        Accent pattern
      </p>
      <div className="flex flex-wrap gap-2">
        {knownL1Tags.map((tag) => (
          <span
            key={tag}
            title={L1_TAG_LABELS[tag]}
            className="inline-block text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded-full px-2.5 py-1 leading-tight"
          >
            {L1_TAG_LABELS[tag]}
          </span>
        ))}
      </div>
      {bridgeFeedback.length > 0 && (
        <div className="mt-4">
          <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2 uppercase tracking-wide">
            How to improve
          </p>
          <div className="space-y-3">
            {bridgeFeedback.map(({ tag, rule }) => (
              <div
                key={tag}
                className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 space-y-1.5"
              >
                <p className="text-sm text-gray-800 dark:text-gray-200">
                  {rule.bridgeInstruction}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  <span className="font-medium">From Spanish:</span> {rule.spanishAnchor}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  <span className="font-medium">English target:</span> {rule.englishTarget}
                </p>
                {rule.minimalPairs.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                      Practice:
                    </span>
                    {rule.minimalPairs.slice(0, 3).map(([a, b]) => (
                      <span
                        key={`${a}-${b}`}
                        className="text-xs bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded px-1.5 py-0.5"
                      >
                        {a} / {b}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Prosodic feedback ────────────────────────────────────────────────────────

export function ProsodicFeedbackSection({
  breakErrors,
  intonationErrors,
}: ProsodicFeedbackSectionProps) {
  return (
    <div>
      <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2 uppercase tracking-wide">
        Prosody
      </p>
      <ul className="space-y-1">
        {breakErrors.map((err) => (
          <li key={`break-${err}`} className="text-xs text-orange-700 dark:text-orange-400">
            Break error: {err}
          </li>
        ))}
        {intonationErrors.map((err) => (
          <li key={`intonation-${err}`} className="text-xs text-orange-700 dark:text-orange-400">
            Intonation error: {err}
          </li>
        ))}
      </ul>
    </div>
  );
}
