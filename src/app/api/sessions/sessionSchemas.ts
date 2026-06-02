// Zod validation schemas for the sessions API route
import { z } from 'zod';
import { SPEAKING_METRIC_KEYS } from '@/lib/metric-keys';

export const SessionFormDataSchema = z.object({
  audio: z.custom<Blob>(
    (val) => val instanceof Blob,
    { message: 'Audio file is required' },
  ),
  duration: z.string().refine((v) => !isNaN(Number(v)) && Number(v) > 0, {
    message: 'Valid duration is required',
  }),
  topic: z.string().nullable(),
  language: z.string().nullable(),
  focusMetricKey: z.enum(SPEAKING_METRIC_KEYS).nullable(),
  isOnboarding: z.union([z.literal('true'), z.literal('false')]).nullable(),
  promptUsed: z.string().max(500).nullable(),
});

export const ChunkedSessionJsonSchema = z.object({
  chunked: z.literal(true),
  topic: z.string().nullable(),
  language: z.string().nullable().default('en'),
  focusMetricKey: z.enum(SPEAKING_METRIC_KEYS).nullable(),
  isOnboarding: z.boolean().default(false),
  promptUsed: z.string().max(500).nullable(),
});

export const SessionListQuerySchema = z.object({
  cursor: z.string().optional(),
  cursorId: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(10),
  dateFilter: z.enum(['7d', '30d', 'all']).default('all'),
  page: z.coerce.number().int().min(1).default(1),
  isOnboarding: z.enum(['false']).optional(),
});
