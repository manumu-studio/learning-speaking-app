// Zod schemas for validating Claude's grammar classification response
import { z } from 'zod';

export const grammarClassificationSchema = z.enum([
  'grammar_error',
  'self_correction',
  'pronunciation_artifact',
  'false_start',
]);

export const grammarErrorTypeSchema = z.enum([
  'verb_tense',
  'article',
  'preposition',
  'agreement',
  'word_order',
  'other',
]);

export const grammarFlagSchema = z.object({
  spanIndex: z.number().int().nonnegative(),
  verbatimText: z.string(),
  normalizedText: z.string(),
  classification: grammarClassificationSchema,
  errorType: grammarErrorTypeSchema.nullable(),
  confidence: z.number().min(0).max(1),
  explanation: z.string(),
  suggestion: z.string(),
  corpusEvidence: z.string().nullable(),
});

export const grammarFlagsResponseSchema = z.object({
  flags: z.array(grammarFlagSchema),
});

export type GrammarFlagsResponse = z.infer<typeof grammarFlagsResponseSchema>;
