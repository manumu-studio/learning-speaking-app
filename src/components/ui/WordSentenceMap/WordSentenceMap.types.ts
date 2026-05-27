// Types for the WordSentenceMap component

import { z } from 'zod';
import type { WordPronunciation } from '@/components/ui/PronunciationSection';

export type WordUnderlineLevel = 'none' | 'amber' | 'red';

export interface TooltipContent {
  detected: string;
  expected: string;
  tip: string;
}

export interface AnnotatedWord {
  word: WordPronunciation;
  underlineLevel: WordUnderlineLevel;
  tooltip: TooltipContent | null;
  index: number;
}

export interface WordSentenceMapProps {
  words: WordPronunciation[];
  animationDelay: number;
}

/** Zod schema for validating the words array at the component boundary */
export const WordSentenceMapWordsSchema = z.array(
  z.object({
    word: z.string(),
    accuracyScore: z.number(),
    errorType: z.string(),
    phonemes: z.unknown(),
    l1Tags: z.array(z.string()),
    breakErrorTypes: z.array(z.string()),
    intonationErrorTypes: z.array(z.string()),
    monotonePitchDelta: z.number().nullable(),
    offsetMs: z.number(),
    durationMs: z.number(),
  })
);
