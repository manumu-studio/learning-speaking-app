// PhonemeDetail: inline expansion panel showing phoneme accuracy, L1 tags, and prosody feedback
'use client';

import React from 'react';
import { usePhonemeAlphabet } from '@/hooks/usePhonemeAlphabet';
import { wordToIpa } from '@/lib/pronunciation/sapiToIpa';
import type { PhonemeDetailProps, L1TagKey } from './PhonemeDetail.types';
import { L1_TAG_LABELS } from './PhonemeDetail.types';
import { usePhonemeDetail } from './usePhonemeDetail';
import {
  PhonemesList,
  L1TagsSection,
  ProsodicFeedbackSection,
} from './PhonemeDetailSections';

export function PhonemeDetail({
  word,
  onClose,
}: PhonemeDetailProps): React.JSX.Element {
  const { phonemes, parseError, bridgeFeedback } = usePhonemeDetail(word);
  const { alphabet, toggleAlphabet, displayPhoneme } = usePhonemeAlphabet();

  const ipaTranscription = phonemes.length > 0 ? wordToIpa(phonemes) : null;
  const detectedPhonemes =
    phonemes.length > 0
      ? phonemes.map((p) => ({ phoneme: p.nBest?.[0]?.phoneme ?? p.phoneme }))
      : [];
  const detectedIpa = detectedPhonemes.length > 0 ? wordToIpa(detectedPhonemes) : null;
  const showDetected = detectedIpa !== null && detectedIpa !== ipaTranscription;

  const knownL1Tags = word.l1Tags.filter(
    (tag): tag is L1TagKey => tag in L1_TAG_LABELS,
  );
  const filteredBreakErrors = word.breakErrorTypes.filter((err) => err !== 'None');
  const hasProsodicFeedback =
    filteredBreakErrors.length > 0 || word.intonationErrorTypes.length > 0;

  return (
    <div
      role="region"
      aria-label={`Phoneme detail for "${word.word}"`}
      className="bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 rounded-lg p-4 space-y-4 transition-all duration-200"
    >
      <PhonemeDetailHeader
        word={word.word}
        accuracyScore={word.accuracyScore}
        alphabet={alphabet}
        ipaTranscription={ipaTranscription}
        detectedIpa={showDetected ? detectedIpa : null}
        onToggleAlphabet={toggleAlphabet}
        onClose={onClose}
      />

      {parseError && (
        <p className="text-xs text-yellow-600 dark:text-yellow-400">
          Phoneme data unavailable for this word.
        </p>
      )}

      {!parseError && phonemes.length > 0 && (
        <PhonemesList phonemes={phonemes} displayPhoneme={displayPhoneme} />
      )}

      {knownL1Tags.length > 0 && (
        <L1TagsSection
          knownL1Tags={knownL1Tags}
          bridgeFeedback={bridgeFeedback}
          displayPhoneme={displayPhoneme}
        />
      )}

      {hasProsodicFeedback && (
        <ProsodicFeedbackSection
          breakErrors={filteredBreakErrors}
          intonationErrors={word.intonationErrorTypes}
        />
      )}
    </div>
  );
}

// ─── private header sub-component ────────────────────────────────────────────

interface PhonemeDetailHeaderProps {
  word: string;
  accuracyScore: number;
  alphabet: 'ipa' | 'sapi';
  ipaTranscription: string | null;
  detectedIpa: string | null;
  onToggleAlphabet: () => void;
  onClose: () => void;
}

function PhonemeDetailHeader({
  word,
  accuracyScore,
  alphabet,
  ipaTranscription,
  detectedIpa,
  onToggleAlphabet,
  onClose,
}: PhonemeDetailHeaderProps) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">
        &ldquo;{word}&rdquo;
        {ipaTranscription !== null && alphabet === 'ipa' && (
          <span className="ml-1 font-mono text-gray-500 dark:text-gray-400">
            /{ipaTranscription}/
          </span>
        )}
        {' '}&mdash; accuracy: {accuracyScore}%
        {detectedIpa !== null && alphabet === 'ipa' && (
          <span className="ml-2 font-mono text-amber-600 dark:text-amber-400">
            You said: /{detectedIpa}/
          </span>
        )}
      </span>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onToggleAlphabet}
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
  );
}
