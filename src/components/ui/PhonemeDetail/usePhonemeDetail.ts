// usePhonemeDetail: parse raw phoneme JSON and derive display data

import { useMemo } from 'react';
import type { WordPronunciation } from '@/components/ui/PronunciationSection';
import { getBridgeRules } from '@/lib/ai/bridgeLookup';
import type { BridgeFeedback } from '@/lib/ai/bridgeRules.types';
import { PhonemeResultArraySchema } from './PhonemeDetail.types';
import type { PhonemeResult } from './PhonemeDetail.types';

export interface ParsedPhonemeData {
  phonemes: PhonemeResult[];
  parseError: boolean;
  bridgeFeedback: BridgeFeedback[];
}

export function usePhonemeDetail(word: WordPronunciation): ParsedPhonemeData {
  const bridgeFeedback = useMemo(
    () => getBridgeRules(word.l1Tags),
    [word.l1Tags],
  );

  const phonemeData = useMemo(() => {
    if (word.phonemes === null || word.phonemes === undefined) {
      return { phonemes: [], parseError: false };
    }

    const result = PhonemeResultArraySchema.safeParse(word.phonemes);

    if (!result.success) {
      return { phonemes: [], parseError: true };
    }

    return { phonemes: result.data, parseError: false };
  }, [word.phonemes]);

  return { ...phonemeData, bridgeFeedback };
}

export function phonemeScoreToColorClass(score: number): string {
  if (score >= 80) return 'bg-green-500';
  if (score >= 60) return 'bg-yellow-500';
  return 'bg-red-500';
}
