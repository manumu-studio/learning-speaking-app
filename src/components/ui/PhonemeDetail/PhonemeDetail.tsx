// PhonemeDetail: inline expansion panel showing phoneme accuracy, L1 tags, and prosody feedback
'use client';
/* eslint-disable complexity, max-lines-per-function */

import React from 'react';
import { usePhonemeAlphabet } from '@/hooks/usePhonemeAlphabet';
import { wordToIpa } from '@/lib/pronunciation/sapiToIpa';
import type { PhonemeDetailProps, L1TagKey } from './PhonemeDetail.types';
import { L1_TAG_LABELS } from './PhonemeDetail.types';
import { ScoreChip } from '@/components/ui/ScoreChip';
import { usePhonemeDetail, phonemeScoreToColorClass } from './usePhonemeDetail';

export function PhonemeDetail({
  word,
  onClose,
}: PhonemeDetailProps): React.JSX.Element {
  const { phonemes, parseError, bridgeFeedback } = usePhonemeDetail(word);
  const { alphabet, toggleAlphabet, displayPhoneme } = usePhonemeAlphabet();

  const ipaTranscription = phonemes.length > 0 ? wordToIpa(phonemes) : null;

  const detectedPhonemes = phonemes.length > 0
    ? phonemes.map((p) => ({ phoneme: p.nBest?.[0]?.phoneme ?? p.phoneme }))
    : [];
  const detectedIpa = detectedPhonemes.length > 0 ? wordToIpa(detectedPhonemes) : null;
  const showDetected = detectedIpa !== null && detectedIpa !== ipaTranscription;

  const knownL1Tags = word.l1Tags.filter(
    (tag): tag is L1TagKey => tag in L1_TAG_LABELS,
  );

  const filteredBreakErrors = word.breakErrorTypes.filter(
    (err) => err !== 'None',
  );

  const hasProsodicFeedback =
    filteredBreakErrors.length > 0 || word.intonationErrorTypes.length > 0;

  return (
    <div
      role="region"
      aria-label={`Phoneme detail for "${word.word}"`}
      className="bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 rounded-lg p-4 space-y-4 transition-all duration-200"
    >
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">
          &ldquo;{word.word}&rdquo;
          {ipaTranscription && alphabet === 'ipa' && (
            <span className="ml-1 font-mono text-gray-500 dark:text-gray-400">
              /{ipaTranscription}/
            </span>
          )}
          {' '}&mdash; accuracy: {word.accuracyScore}%
          {showDetected && alphabet === 'ipa' && (
            <span className="ml-2 font-mono text-amber-600 dark:text-amber-400">
              You said: /{detectedIpa}/
            </span>
          )}
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggleAlphabet}
            className="text-xs px-2 py-0.5 rounded-full border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            aria-label={`Switch to ${alphabet === 'ipa' ? 'SAPI' : 'IPA'} phoneme display`}
          >
            {alphabet === 'ipa' ? 'IPA' : 'SAPI'}
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close phoneme detail"
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors text-lg leading-none"
          >
            &times;
          </button>
        </div>
      </div>

      {parseError && (
        <p className="text-xs text-yellow-600 dark:text-yellow-400">
          Phoneme data unavailable for this word.
        </p>
      )}

      {!parseError && phonemes.length > 0 && (
        <div>
          <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2 uppercase tracking-wide">
            Phonemes
          </p>
          <div className="space-y-2">
            {phonemes.map((phoneme, i) => {
              const topAlternative = phoneme.nBest?.[0];
              const showAlternative =
                topAlternative !== undefined &&
                topAlternative.phoneme !== phoneme.phoneme;

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
      )}

      {knownL1Tags.length > 0 && (
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
      )}

      {hasProsodicFeedback && (
        <div>
          <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2 uppercase tracking-wide">
            Prosody
          </p>
          <ul className="space-y-1">
            {filteredBreakErrors.map((err) => (
              <li key={`break-${err}`} className="text-xs text-orange-700 dark:text-orange-400">
                Break error: {err}
              </li>
            ))}
            {word.intonationErrorTypes.map((err) => (
              <li key={`intonation-${err}`} className="text-xs text-orange-700 dark:text-orange-400">
                Intonation error: {err}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
