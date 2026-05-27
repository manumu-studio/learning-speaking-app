// useWordColorMap: expand/collapse state and color computation for the word transcript

import { useState, useCallback, useMemo } from 'react';
import type { WordPronunciation } from '@/components/ui/PronunciationSection';
import type { ColoredWord, WordColor } from './WordColorMap.types';

const NON_BLOCKING_L1_TAGS = new Set([
  'b_for_v',
  'z_devoicing',
  'no_schwa_reduction',
  'vowel_collapse',
]);

function computeWordColor(word: WordPronunciation): WordColor {
  if (word.errorType === 'Insertion') return 'gray-italic';

  if (word.errorType === 'Mispronunciation' || word.errorType === 'Omission') return 'amber';

  const allL1NonBlocking =
    word.l1Tags.length > 0 && word.l1Tags.every((tag) => NON_BLOCKING_L1_TAGS.has(tag));

  if (allL1NonBlocking) return 'yellow';

  if (word.accuracyScore < 60) return 'amber';

  if (word.accuracyScore < 80) return 'yellow';

  return 'green';
}

export interface UseWordColorMapReturn {
  coloredWords: ColoredWord[];
  expandedIndex: number | null;
  toggleWord: (index: number) => void;
  closeExpanded: () => void;
}

export function useWordColorMap(words: WordPronunciation[]): UseWordColorMapReturn {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  const toggleWord = useCallback((index: number) => {
    setExpandedIndex((prev) => (prev === index ? null : index));
  }, []);

  const closeExpanded = useCallback(() => {
    setExpandedIndex(null);
  }, []);

  const coloredWords = useMemo<ColoredWord[]>(
    () => words.map((word, index) => ({ word, color: computeWordColor(word), index })),
    [words],
  );

  return { coloredWords, expandedIndex, toggleWord, closeExpanded };
}
