// Claude Haiku client for analyzing transcripts and detecting recurring patterns
import { z } from 'zod';
import { getAnthropicClient } from '@/lib/ai/client';
import { buildSystemPrompt, buildUserPrompt } from './analyzePrompts';

export const transcriptionArtefactSchema = z.object({
  word: z.string(),
  context: z.string(),
});

// Claude response insight shape — Prisma fields plus optional confidence (stripped before DB write)
export const insightSchema = z.object({
  category: z.enum(['grammar', 'vocabulary', 'structure']),
  pattern: z.string(),
  detail: z.string(),
  frequency: z.number().nullish(),
  severity: z.enum(['high', 'medium', 'low']).nullish(),
  examples: z.array(z.string()).nullish(),
  suggestion: z.string().nullish(),
  confidence: z.number().min(1).max(5).nullish(),
});

// Metric scoring schema — accepts 8 Claude-scored keys + 3 Azure-computed keys (for schema completeness)
export const metricSchema = z.object({
  key: z.enum([
    'connectorRepetition',
    'structuralVariety',
    'vocabularyPrecision',
    'verbAccuracy',
    'argumentClosure',
    'fillerUsage',
    'lexicalSophistication',
    'registerPragmatics',
    'pronunciationAccuracy',
    'prosodyScore',
    'speakingRate',
  ]),
  level: z.enum(['low', 'medium', 'high']),
  score: z.number().min(1).max(10),
  note: z.string(),
});

/** Parsed Claude output for one session — must match downstream Prisma writes and dashboard metrics. */
export const analysisResultSchema = z.object({
  insights: z.array(insightSchema).max(5),
  metrics: z.array(metricSchema),
  focusNext: z.string(),
  summary: z.string(),
  intentLabel: z.string(),
  possible_transcription_artefacts: z.array(transcriptionArtefactSchema).optional(),
  coherenceScore: z
    .object({
      score: z.number().min(0).max(10),
      topicDevelopment: z.string(),
      logicalFlow: z.string(),
      discourseMarkersUsed: z.array(z.string()),
      discourseMarkersRecommended: z.array(z.string()),
    })
    .optional(),
  vocabularyDiversity: z
    .object({
      typeTokenRatio: z.number().min(0).max(1),
      academicWordCount: z.number().int().nonnegative(),
      repetitionFlags: z.array(
        z.object({
          word: z.string(),
          count: z.number().int().min(2),
          alternatives: z.array(z.string()).min(2).max(5),
        }),
      ),
    })
    .optional(),
  l1Interference: z
    .array(
      z.object({
        type: z.enum(['calque', 'false_cognate', 'syntax_pattern']),
        detected: z.string(),
        explanation: z.string(),
        suggestion: z.string(),
      }),
    )
    .optional(),
  vocabularySuggestions: z
    .array(
      z.object({
        word: z.string(),
        meaning: z.string(),
        exampleSentence: z.string(),
        type: z.enum(['word', 'collocation', 'phrase']).optional().default('word'),
        domain: z.enum(['general', 'business', 'tech', 'academic', 'medical', 'legal']).optional().default('general'),
        frequencyBand: z.enum(['high', 'mid', 'low', 'rare']).optional().default('mid'),
      }),
    )
    .max(3)
    .optional(),
  collocations: z
    .array(
      z.object({
        detected: z.string(),
        nativeAlternative: z.string(),
        explanation: z.string(),
      }),
    )
    .max(3)
    .optional(),
  registerFeedback: z
    .object({
      register: z.enum(['formal', 'neutral', 'informal']),
      appropriateness: z.enum(['appropriate', 'slightly-off', 'mismatch']),
      hedgingLevel: z.enum(['adequate', 'under-hedged', 'over-hedged']),
      directnessLevel: z.enum([
        'appropriately-direct',
        'too-direct',
        'too-indirect',
      ]),
      suggestions: z
        .array(
          z.object({
            original: z.string(),
            issue: z.string(),
            alternative: z.string(),
          }),
        )
        .max(5),
      note: z.string(),
    })
    .optional(),
});

export type AnalysisResult = z.infer<typeof analysisResultSchema>;
export type Insight = z.infer<typeof insightSchema>;
export type RegisterFeedbackData = NonNullable<AnalysisResult['registerFeedback']>;

/** Lean Azure pronunciation data passed to Claude as context — not scored by Claude. */
export type PronunciationSummary = {
  topWeakPhonemes: string[];
  l1Tags: string[];
  accuracyScore: number;
  prosodyScore: number;
};

// Match ⟨?...?⟩ markers — [^⟩]* allows question marks inside suspect transcript text
const SUSPECT_MARKER_PATTERN = /⟨\?[^⟩]*\?⟩/;

function insightReferencesSuspectMarkers(insight: Insight): boolean {
  const fields = [insight.pattern, insight.detail, ...(insight.examples ?? [])];
  return fields.some((field) => SUSPECT_MARKER_PATTERN.test(field));
}

function insightBelowConfidenceFloor(insight: Insight): boolean {
  return insight.confidence != null && insight.confidence < 4;
}

function insightBelowFrequencyFloor(insight: Insight): boolean {
  if (insight.frequency != null && insight.frequency < 2) {
    return true;
  }
  if (insight.examples != null && insight.examples.length < 2) {
    return true;
  }
  return false;
}

/**
 * Applies post-parse guardrails to Claude-generated insights, mirroring the hard rules in the system prompt.
 *
 * Filters out insights that:
 * - Reference text wrapped in `⟨?...?⟩` (low-confidence ASR markers).
 * - Have a `confidence` score below 4 out of 5.
 * - Have fewer than 2 supporting examples (`frequency < 2` or `examples.length < 2`).
 *
 * @param insights - Raw insight array returned by `analysisResultSchema.parse()`.
 * @returns The filtered subset of insights that pass all guardrails.
 */
export function applyInsightGuardrails(insights: Insight[]): Insight[] {
  return insights.filter((insight) => {
    if (insightReferencesSuspectMarkers(insight)) {
      return false;
    }
    if (insightBelowConfidenceFloor(insight)) {
      return false;
    }
    if (insightBelowFrequencyFloor(insight)) {
      return false;
    }
    return true;
  });
}

/**
 * Analyzes a speech transcript with Claude Haiku and returns structured coaching data.
 *
 * Results are cached in Redis (keyed by SHA-256 hash of the transcript) with a 7-day TTL.
 * On cache hit the Claude call is skipped entirely. Post-parse guardrails are applied via
 * {@link applyInsightGuardrails} before the result is returned or persisted.
 *
 * @param transcript - Raw transcript text produced by Whisper (may contain `⟨?...?⟩` markers).
 * @param focusMetricKey - Optional metric key the user is currently training; biases the `focusNext` field.
 * @param pronunciationSummary - Optional Azure pronunciation context (accuracy score, weak phonemes, L1 tags).
 * @param promptUsed - Optional speaking-prompt text shown to the user; included as context in the user message.
 * @returns A validated `AnalysisResult` with insights, metrics, CEFR signals, and coaching labels.
 */
export async function analyzeTranscript(
  transcript: string,
  focusMetricKey?: string | null,
  pronunciationSummary?: PronunciationSummary | null,
  promptUsed?: string | null,
): Promise<AnalysisResult> {
  const { hashTranscript, getCachedAnalysis, setCachedAnalysis } = await import(
    '@/lib/ai/analysisCache'
  );

  const transcriptHash = hashTranscript(transcript);

  const cached = await getCachedAnalysis(transcriptHash);
  if (cached !== null) {
    return cached;
  }

  const client = getAnthropicClient();
  const systemPrompt = buildSystemPrompt();
  const userPrompt = buildUserPrompt(transcript, focusMetricKey, pronunciationSummary, promptUsed);

  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 3072,
    system: systemPrompt,
    messages: [
      {
        role: 'user',
        content: userPrompt,
      },
    ],
  });

  const content = message.content[0] ?? null;
  if (content === null || content.type !== 'text') {
    throw new Error('Unexpected response type from Claude');
  }

  // Strip markdown code fences Claude sometimes wraps around JSON
  const rawText = content.text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();

  // Parse and validate response with Zod — throws ZodError on schema mismatch
  const parsed: unknown = JSON.parse(rawText);
  const validated = analysisResultSchema.parse(parsed);

  const result: AnalysisResult = {
    ...validated,
    insights: applyInsightGuardrails(validated.insights),
  };

  void setCachedAnalysis(transcriptHash, result);

  return result;
}
