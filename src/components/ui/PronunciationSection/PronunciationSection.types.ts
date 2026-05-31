// Types for the PronunciationSection component and its score gauge sub-elements

import { z } from 'zod';

// Zod schema for a single word in the pronunciation report
export const WordPronunciationSchema = z.object({
  word: z.string(),
  display: z.string().nullable().optional(),
  accuracyScore: z.number(),
  errorType: z.string(),
  offsetMs: z.number(),
  durationMs: z.number(),
  phonemes: z.unknown(),
  l1Tags: z.array(z.string()),
  breakErrorTypes: z.array(z.string()),
  intonationErrorTypes: z.array(z.string()),
  monotonePitchDelta: z.number().nullable(),
});

// Zod schema for the full pronunciation report
export const PronunciationReportSchema = z.object({
  pronScore: z.number(),
  accuracyScore: z.number(),
  fluencyScore: z.number(),
  completenessScore: z.number(),
  prosodyScore: z.number(),
  speakingRateWpm: z.number(),
  failureReason: z.string().nullable(),
  words: z.array(WordPronunciationSchema),
});

export type WordPronunciation = z.infer<typeof WordPronunciationSchema>;
export type PronunciationReport = z.infer<typeof PronunciationReportSchema>;

/** Data shape for the optional progress chip shown below the tier badges */
export interface ProgressChipData {
  metricLabel: string;
  /** Positive = improvement, negative = decline. Null if no prior data. */
  deltaPercent: number | null;
}

export interface PronunciationSectionProps {
  pronunciationReport: PronunciationReport;
  animationDelay: number;
  /** Optional progress chip data from pronunciation-history API */
  progressChip?: ProgressChipData;
}

export interface ScoreGaugeProps {
  label: string;
  azureScore: number;
  displayScore: number;
}

export type WpmStatus = 'ideal' | 'outside-ideal';
