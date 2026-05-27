// Types for the PronunciationProgress component

import { z } from 'zod';

export const HistoryItemSchema = z.object({
  sessionId: z.string(),
  createdAt: z.string(),
  fluencyScore: z.number(),
  accuracyScore: z.number(),
  pronScore: z.number(),
});

export type HistoryItem = z.infer<typeof HistoryItemSchema>;

export const PronunciationHistorySchema = z.object({
  history: z.array(HistoryItemSchema),
});

export interface PronunciationProgressProps {
  /** Current session's sessionId — used to identify which history item is "now" */
  currentSessionId: string;
  history: HistoryItem[];
  animationDelay: number;
}

export type TrendDirection = 'up' | 'down' | 'flat';

export interface TrendSummary {
  metric: 'fluency' | 'accuracy';
  deltaPercent: number;
  direction: TrendDirection;
}
