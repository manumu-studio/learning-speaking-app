// Types for the DailyConclusion structured JSON (conclusionJson field)

import { z } from 'zod';

const WinSchema = z.object({
  tag: z.string(),
  detail: z.string(),
  evidenceSessionId: z.string(),
});

const StruggleSchema = z.object({
  tag: z.string(),
  detail: z.string(),
  count: z.number().int().nonnegative(),
  flagIds: z.array(z.string()).optional(),
});

const PersistentStruggleSchema = z.object({
  tag: z.string(),
  daysRecurring: z.number().int().positive(),
});

const ImprovedItemSchema = z.object({
  tag: z.string(),
  yesterdayValue: z.number(),
  todayValue: z.number(),
});

const NewVocabSchema = z.object({
  text: z.string(),
  category: z.string(),
});

const FocusTomorrowSchema = z.object({
  tag: z.string(),
  reason: z.string(),
});

export const DailyConclusionDataSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  overallScore: z.number().min(0).max(10),
  totalDurationSecs: z.number().int().nonnegative(),
  topicSentence: z.string(),
  pillarScores: z.object({
    delivery: z.number().min(0).max(10),
    language: z.number().min(0).max(10),
    pronunciation: z.number().min(0).max(10),
  }),
  metricDeltas: z.object({
    delivery: z.number().nullable(),
    language: z.number().nullable(),
    pronunciation: z.number().nullable(),
  }),
  wins: z.array(WinSchema),
  struggles: z.array(StruggleSchema),
  persistentStruggles: z.array(PersistentStruggleSchema),
  improvedSinceYesterday: z.array(ImprovedItemSchema),
  newVocabSpotted: z.array(NewVocabSchema),
  focusTomorrow: z.array(FocusTomorrowSchema),
  activeTargetsTomorrow: z.array(z.string()).max(4),
  keyInsights: z.array(z.string()).max(3),
  tone: z.literal('supportive_neutral'),
});

export type DailyConclusionData = z.infer<typeof DailyConclusionDataSchema>;
export type Win = z.infer<typeof WinSchema>;
export type Struggle = z.infer<typeof StruggleSchema>;
export type PersistentStruggle = z.infer<typeof PersistentStruggleSchema>;
export type ImprovedItem = z.infer<typeof ImprovedItemSchema>;
export type FocusTomorrow = z.infer<typeof FocusTomorrowSchema>;
