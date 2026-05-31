// Aggregates per-word prosody signals for ProsodyFeedback display
import { useMemo } from 'react';
import type { WordPronunciation } from '@/components/ui/PronunciationSection';
import type { WordProsodyIndicator } from './ProsodyFeedback.types';

const MONOTONE_THRESHOLD = 0.3;

const ERROR_LABEL_MAP: Record<string, string> = {
  UnexpectedBreak: 'Unexpected pause',
  MissingBreak: 'Missing pause',
  MonotonePitch: 'Flat intonation',
  MonotoneRate: 'Flat rhythm',
};

function toLabel(sdkType: string): string {
  return ERROR_LABEL_MAP[sdkType] ?? sdkType;
}

export function useProsodyFeedback(words: WordPronunciation[]) {
  return useMemo(() => {
    const wordIndicators: WordProsodyIndicator[] = words.map((word, index) => ({
      word: word.word,
      index,
      hasIntonationIssue: word.intonationErrorTypes.length > 0,
      hasBreakIssue: word.breakErrorTypes.length > 0,
      isMonotone:
        word.monotonePitchDelta !== null && word.monotonePitchDelta < MONOTONE_THRESHOLD,
      intonationLabels: word.intonationErrorTypes.map(toLabel),
      breakLabels: word.breakErrorTypes.map(toLabel),
    }));

    const wordsWithIssues = wordIndicators.filter(
      (w) => w.hasIntonationIssue || w.hasBreakIssue || w.isMonotone,
    );

    const hasMonotonePattern = wordIndicators.some((w) => w.isMonotone);

    return { wordIndicators, wordsWithIssues, hasMonotonePattern };
  }, [words]);
}
