// usePhonemeDetail: parse raw phoneme JSON and derive display data

import { useMemo } from 'react';
import type { WordPronunciation } from '@/components/ui/PronunciationSection';
import { PhonemeResultArraySchema } from './PhonemeDetail.types';
import type { PhonemeResult } from './PhonemeDetail.types';

export interface ParsedPhonemeData {
  phonemes: PhonemeResult[];
  parseError: boolean;
}

export function usePhonemeDetail(word: WordPronunciation): ParsedPhonemeData {
  return useMemo(() => {
    if (word.phonemes === null || word.phonemes === undefined) {
      return { phonemes: [], parseError: false };
    }

    const result = PhonemeResultArraySchema.safeParse(word.phonemes);

    if (!result.success) {
      return { phonemes: [], parseError: true };
    }

    return { phonemes: result.data, parseError: false };
  }, [word.phonemes]);
}

export function phonemeScoreToColorClass(score: number): string {
  if (score >= 80) return 'bg-green-500';
  if (score >= 60) return 'bg-yellow-500';
  return 'bg-red-500';
}
