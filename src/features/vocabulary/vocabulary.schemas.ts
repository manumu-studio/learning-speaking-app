// Zod schemas for vocabulary API response validation on the client
import { z } from 'zod';

export const ReviewCardItemSchema = z.object({
  id: z.string(),
  word: z.string(),
  meaning: z.string(),
  exampleSentence: z.string(),
  type: z.enum(['word', 'collocation', 'phrase']),
  domain: z.string(),
  frequencyBand: z.string(),
  interval: z.number(),
  reviewCount: z.number(),
  nextReviewAt: z.string().nullable().optional(),
  lastReviewedAt: z.string().nullable().optional(),
  createdAt: z.string().optional(),
});

export const VocabItemSchema = ReviewCardItemSchema.extend({
  firstUsedAt: z.string().nullable(),
  nextReviewAt: z.string().nullable(),
  createdAt: z.string(),
});

export const VocabStatsDataSchema = z.object({
  totalItems: z.number(),
  dueCount: z.number(),
  adoptedCount: z.number(),
  adoptionRate: z.number(),
  averageInterval: z.number(),
  domainBreakdown: z.array(z.object({ domain: z.string(), count: z.number() })),
  typeBreakdown: z.array(z.object({ type: z.string(), count: z.number() })),
  frequencyBreakdown: z.array(z.object({ band: z.string(), count: z.number() })),
});
