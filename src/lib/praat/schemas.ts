// Zod schemas for Praat service API responses
import { z } from 'zod';

export const ContourDataSchema = z.object({
  frame_ms: z.number().int().positive(),
  f0_hz: z.array(z.number()),
  intensity_db: z.array(z.number()),
  voiced: z.array(z.boolean()),
  duration_ms: z.number().int().nonnegative(),
});

export const ExtractResponseSchema = z.object({
  status: z.enum(['ok', 'error']),
  contour: ContourDataSchema.nullable().optional(),
  error: z.string().nullable().optional(),
});

export type ContourDataPayload = z.infer<typeof ContourDataSchema>;
