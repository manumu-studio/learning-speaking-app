// Shared Zod schemas and types for the trends feature — used by both API route and client hooks
import { z } from 'zod';

export const MetricKeySchema = z.enum([
  'connectorRepetition',
  'structuralVariety',
  'vocabularyPrecision',
  'verbAccuracy',
  'argumentClosure',
  'fillerUsage',
  'lexicalSophistication',
  'pronunciationAccuracy',
  'prosodyScore',
  'speakingRate',
]);

export const PillarKeySchema = z.enum(['delivery', 'language', 'pronunciation']);

export const RangeSchema = z.enum(['7d', '30d', '90d', 'all']);

export const TrendDataPointSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  scores: z.record(MetricKeySchema, z.number().min(0).max(10)),
});

export const PillarTrendSchema = z.object({
  pillarKey: PillarKeySchema,
  label: z.string(),
  color: z.string(),
  dataPoints: z.array(
    z.object({
      date: z.string(),
      averageScore: z.number().min(0).max(10),
    }),
  ),
  deltaPercent: z.number().nullable(),
});

export const TrendsResponseSchema = z.object({
  range: RangeSchema,
  dataPoints: z.array(TrendDataPointSchema),
  pillarTrends: z.array(PillarTrendSchema),
  sessionCount: z.number().int().min(0),
});

export type TrendsResponse = z.infer<typeof TrendsResponseSchema>;
export type TrendDataPoint = z.infer<typeof TrendDataPointSchema>;
export type PillarTrend = z.infer<typeof PillarTrendSchema>;
