// Hook for PronunciationTipsCard — triggers Claude tip generation on mount
'use client';

import { useState, useEffect } from 'react';
import type { PronunciationReport } from '@/components/ui/PronunciationSection';
import type { TipsLoadState } from './PronunciationTipsCard.types';
import { PronunciationTipsResponseSchema } from './PronunciationTipsCard.types';

const WEAK_WORD_THRESHOLD = 70;

export function usePronunciationTipsCard(
  pronunciationReport: PronunciationReport
): TipsLoadState {
  const [state, setState] = useState<TipsLoadState>({ status: 'loading' });

  useEffect(() => {
    const weakWords = pronunciationReport.words
      .filter((w) => w.accuracyScore < WEAK_WORD_THRESHOLD)
      .sort((a, b) => a.accuracyScore - b.accuracyScore)
      .slice(0, 10)
      .map((w) => ({
        word: w.word,
        accuracyScore: w.accuracyScore,
        errorType: w.errorType,
      }));

    const l1Tags = [...new Set(pronunciationReport.words.flatMap((w) => w.l1Tags))].slice(0, 10);

    void fetch('/api/pronunciation-tips', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        pronScore: pronunciationReport.pronScore,
        accuracyScore: pronunciationReport.accuracyScore,
        fluencyScore: pronunciationReport.fluencyScore,
        completenessScore: pronunciationReport.completenessScore,
        prosodyScore: pronunciationReport.prosodyScore,
        speakingRateWpm: pronunciationReport.speakingRateWpm,
        weakWords,
        topWeakPhonemes: [],
        l1Tags,
      }),
    })
      .then(async (res) => {
        if (!res.ok) throw new Error('Tips request failed');
        const json: unknown = await res.json();
        const parsed = PronunciationTipsResponseSchema.safeParse(json);
        if (parsed.success) {
          setState({ status: 'done', tips: parsed.data.tips });
        } else {
          setState({ status: 'error' });
        }
      })
      .catch(() => setState({ status: 'error' }));
  }, [pronunciationReport]);

  return state;
}
