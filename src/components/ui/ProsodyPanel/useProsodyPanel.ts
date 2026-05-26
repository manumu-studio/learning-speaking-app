// useProsodyPanel: aggregates prosody signals across all words for display

import { useMemo } from 'react';
import type { WordPronunciation } from '@/components/ui/PronunciationSection';
import type { ErrorFrequency, RateStatus } from './ProsodyPanel.types';

const MONOTONE_THRESHOLD = 0.3;
const IDEAL_WPM_MIN = 110;
const IDEAL_WPM_MAX = 140;
const TOP_N_ERRORS = 3;

export interface ProsodyAnalysis {
  rateStatus: RateStatus;
  hasSyllableTimedRhythm: boolean;
  topErrors: ErrorFrequency[];
  isMonotone: boolean;
  averagePitchDelta: number | null;
}

export function useProsodyPanel(
  words: WordPronunciation[],
  speakingRateWpm: number,
): ProsodyAnalysis {
  return useMemo(() => {
    let rateStatus: RateStatus;
    if (speakingRateWpm < IDEAL_WPM_MIN) {
      rateStatus = 'too-slow';
    } else if (speakingRateWpm > IDEAL_WPM_MAX) {
      rateStatus = 'too-fast';
    } else {
      rateStatus = 'ideal';
    }

    const hasSyllableTimedRhythm = words.some((w) =>
      w.l1Tags.includes('syllable_timed'),
    );

    const errorCounts = new Map<string, number>();
    for (const word of words) {
      for (const err of word.breakErrorTypes) {
        errorCounts.set(err, (errorCounts.get(err) ?? 0) + 1);
      }
      for (const err of word.intonationErrorTypes) {
        errorCounts.set(err, (errorCounts.get(err) ?? 0) + 1);
      }
    }

    const topErrors: ErrorFrequency[] = [...errorCounts.entries()]
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, TOP_N_ERRORS);

    const pitchDeltas = words
      .map((w) => w.monotonePitchDelta)
      .filter((d): d is number => d !== null);

    const averagePitchDelta =
      pitchDeltas.length > 0
        ? pitchDeltas.reduce((sum, d) => sum + d, 0) / pitchDeltas.length
        : null;

    const isMonotone =
      averagePitchDelta !== null && averagePitchDelta < MONOTONE_THRESHOLD;

    return {
      rateStatus,
      hasSyllableTimedRhythm,
      topErrors,
      isMonotone,
      averagePitchDelta,
    };
  }, [words, speakingRateWpm]);
}
