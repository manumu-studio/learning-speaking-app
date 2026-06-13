// Shared types and Zod schemas for the evals pipeline.
// Provides AzureRawJsonSchema (validates frozen Azure utterance payloads)
// and the judged metric key union + GoldenInput type used by snapshot and judge scripts.

import { z } from 'zod';

// ─── Judged metric keys ──────────────────────────────────────────────

export const JUDGED_METRIC_KEYS = [
  'connectorRepetition',
  'structuralVariety',
  'vocabularyPrecision',
  'verbAccuracy',
  'argumentClosure',
  'lexicalSophistication',
  'registerPragmatics',
] as const;

export type JudgedMetricKey = (typeof JUDGED_METRIC_KEYS)[number];

// ─── Azure raw JSON schema ───────────────────────────────────────────

// Validates the minimum shape of a frozen Azure utterance payload.
// Derived from PronunciationResult fields consumed by persistPronunciation.ts
// and buildPronunciationSummary in pipelineHelpers.ts.
const PhonemeSchema = z.object({
  phoneme: z.string(),
  accuracyScore: z.number(),
});

const ProsodyFeedbackSchema = z
  .object({
    breakErrorTypes: z.array(z.string()).optional(),
    intonationErrorTypes: z.array(z.string()).optional(),
    monotoneSyllablePitchDeltaConfidence: z.number().optional(),
  })
  .optional();

const WordResultSchema = z.object({
  word: z.string(),
  display: z.string().optional(),
  accuracyScore: z.number(),
  errorType: z.string(),
  offsetMs: z.number(),
  durationMs: z.number(),
  phonemes: z.array(PhonemeSchema),
  l1Tags: z.array(z.string()).optional(),
  prosodyFeedback: ProsodyFeedbackSchema,
});

export const AzureRawJsonSchema = z.object({
  pronScore: z.number(),
  accuracyScore: z.number(),
  fluencyScore: z.number(),
  completenessScore: z.number(),
  prosodyScore: z.number(),
  words: z.array(WordResultSchema),
  // rawUtterances is the exact value written by persistPronunciation.ts line 83
  rawUtterances: z.array(z.unknown()),
});

export type AzureRawJson = z.infer<typeof AzureRawJsonSchema>;

// ─── GoldenInput ─────────────────────────────────────────────────────

// Typed input for creating a GoldenSession row from a snapshot script.
export interface GoldenInput {
  sourceSessionId: string | null;
  cleanTranscript: string;
  verbatimTranscript: string | null;
  pronunciationSummary: string | null;
  azureRawJson: AzureRawJson | null;
  promptUsed: string | null;
  focusMetricKey: string | null;
  stratum: string;
  rubricVersion: string;
}
