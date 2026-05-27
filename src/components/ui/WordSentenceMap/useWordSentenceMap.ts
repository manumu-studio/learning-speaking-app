// Hook for WordSentenceMap — maps raw word pronunciation data to annotated display words
import { useState, useCallback } from 'react';
import type { WordPronunciation } from '@/components/ui/PronunciationSection';
import type { AnnotatedWord, TooltipContent, WordUnderlineLevel } from './WordSentenceMap.types';

const ACCURACY_THRESHOLDS = {
  EXCELLENT: 80,
  LEARNABLE: 60,
} as const;

function scoreToUnderlineLevel(accuracyScore: number, errorType: string): WordUnderlineLevel {
  if (errorType === 'Insertion') return 'amber';
  if (accuracyScore >= ACCURACY_THRESHOLDS.EXCELLENT) return 'none';
  if (accuracyScore >= ACCURACY_THRESHOLDS.LEARNABLE) return 'amber';
  return 'red';
}

function buildTooltip(word: WordPronunciation): TooltipContent | null {
  if (word.errorType === 'None' && word.accuracyScore >= ACCURACY_THRESHOLDS.EXCELLENT) {
    return null;
  }

  if (word.errorType === 'Omission') {
    return {
      detected: '(not said)',
      expected: word.word,
      tip: `You skipped "${word.word}". Try repeating the sentence and include this word.`,
    };
  }

  if (word.errorType === 'Insertion') {
    return {
      detected: word.word,
      expected: '(not in reference)',
      tip: `"${word.word}" was not in the expected sentence. Double-check the reference text.`,
    };
  }

  const genericTip =
    word.accuracyScore < ACCURACY_THRESHOLDS.LEARNABLE
      ? `Focus on pronouncing each syllable of "${word.word}" clearly. Try saying it slowly first.`
      : `Your pronunciation of "${word.word}" is close — keep practising for full accuracy.`;

  return {
    detected: word.word,
    expected: word.word,
    tip: genericTip,
  };
}

export function useWordSentenceMap(words: WordPronunciation[]): {
  annotatedWords: AnnotatedWord[];
  openIndex: number | null;
  openTooltip: (index: number) => void;
  closeTooltip: () => void;
} {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const openTooltip = useCallback((index: number) => {
    setOpenIndex((prev) => (prev === index ? null : index));
  }, []);

  const closeTooltip = useCallback(() => {
    setOpenIndex(null);
  }, []);

  const annotatedWords: AnnotatedWord[] = words.map((word, index) => ({
    word,
    underlineLevel: scoreToUnderlineLevel(word.accuracyScore, word.errorType),
    tooltip: buildTooltip(word),
    index,
  }));

  return { annotatedWords, openIndex, openTooltip, closeTooltip };
}
