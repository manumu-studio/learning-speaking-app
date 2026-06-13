// eval/judgeProvider.ts
// Promptfoo CustomApiProvider - wraps analyzeTranscript for the eval harness.
// Called once per test case. Persists per-metric scores to JudgeRun rows.

import crypto from 'node:crypto';
import { z } from 'zod';
import { prisma } from '../src/lib/prisma';
import { analyzeTranscript } from '../src/lib/ai/analyze';
import type { PronunciationSummary } from '../src/lib/ai/analyze';
import { JUDGED_METRIC_KEYS, type JudgedMetricKey } from '../src/lib/eval/golden.types';

// ---------------------------------------------------------------------------
// Promptfoo provider interface (inlined — avoids a devDependency type import
// that may not exist until promptfoo is installed)
// ---------------------------------------------------------------------------

interface ProviderResponse {
  output?: string;
  error?: string;
}

interface CallApiContext {
  vars?: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Constants + types
// ---------------------------------------------------------------------------

type MetricScoreMap = Record<JudgedMetricKey, number>;

// ---------------------------------------------------------------------------
// Runtime guards
// ---------------------------------------------------------------------------

function isJudgedMetricKey(key: string): key is JudgedMetricKey {
  return JUDGED_METRIC_KEYS.some((k) => k === key);
}

function assertNonEmptyString(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`Test-case var "${field}" must be a non-empty string`);
  }
  return value;
}

// Zod schema for PronunciationSummary — validates the external vars boundary
const PronunciationSummarySchema = z.object({
  topWeakPhonemes: z.array(z.string()),
  l1Tags: z.array(z.string()),
  accuracyScore: z.number(),
  prosodyScore: z.number(),
});

function parsePronunciationSummary(raw: unknown): PronunciationSummary | null {
  if (raw === null || raw === undefined) return null;
  const result = PronunciationSummarySchema.safeParse(raw);
  return result.success ? result.data : null;
}

// ---------------------------------------------------------------------------
// Helpers — extracted to stay within max-lines-per-function: 80
// ---------------------------------------------------------------------------

interface ParsedVars {
  transcript: string;
  goldenId: string;
  promptUsed: string | null;
  focusMetricKey: string | null;
  pronunciationSummary: PronunciationSummary | null;
  modelPin: string;
  promptHash: string;
  runIndex: number;
}

function parseVars(vars: Record<string, unknown>): ParsedVars {
  const transcript = assertNonEmptyString(vars['transcript'], 'transcript');
  const goldenId = assertNonEmptyString(vars['goldenId'], 'goldenId');
  const promptUsed = typeof vars['promptUsed'] === 'string' ? vars['promptUsed'] : null;
  const focusMetricKey =
    typeof vars['focusMetricKey'] === 'string' && vars['focusMetricKey'].length > 0
      ? vars['focusMetricKey']
      : null;

  // pronunciationSummary may arrive as a JSON string or a parsed object
  const rawSummary = vars['pronunciationSummary'];
  const parsedSummary: unknown =
    typeof rawSummary === 'string' ? JSON.parse(rawSummary) : rawSummary;
  const pronunciationSummary: PronunciationSummary | null =
    parsePronunciationSummary(parsedSummary);

  const modelPin =
    typeof vars['modelPin'] === 'string' ? vars['modelPin'] : 'claude-haiku-4-5-20251001';

  const promptHash =
    typeof vars['promptHash'] === 'string'
      ? vars['promptHash']
      : crypto.createHash('sha256').update(promptUsed ?? '').digest('hex');

  const runIndex = typeof vars['runIndex'] === 'number' ? vars['runIndex'] : 0;

  return { transcript, goldenId, promptUsed, focusMetricKey, pronunciationSummary, modelPin, promptHash, runIndex };
}

interface JudgeRunMeta {
  goldenId: string;
  modelPin: string;
  promptHash: string;
  runIndex: number;
}

async function persistJudgeRuns(
  meta: JudgeRunMeta,
  scoreMap: Partial<MetricScoreMap>,
): Promise<void> {
  await Promise.all(
    JUDGED_METRIC_KEYS.map((metricKey) => {
      const aiScore = scoreMap[metricKey];
      if (aiScore === undefined) return Promise.resolve();
      return prisma.judgeRun.create({
        data: {
          goldenId: meta.goldenId,
          metric: metricKey,
          aiScore,
          modelPin: meta.modelPin,
          promptHash: meta.promptHash,
          // analyzeTranscript does not accept a temperature param; the Anthropic API
          // uses its server-side default. We store 0 as a sentinel value to indicate
          // "uncontrolled / API default" and to satisfy the non-nullable DB column.
          temperature: 0,
          runIndex: meta.runIndex,
        },
      });
    }),
  );
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export default class JudgeProvider {
  /** Stable identifier shown in Promptfoo result tables. */
  id(): string {
    return 'analyzeTranscript-judge';
  }

  /**
   * Called once per test case by Promptfoo.
   *
   * Expected vars (written by scripts/eval/export-testcases.ts):
   *   transcript, goldenId, promptUsed, focusMetricKey,
   *   pronunciationSummary, modelPin, promptHash, runIndex
   */
  async callApi(_prompt: string, context: CallApiContext): Promise<ProviderResponse> {
    try {
      const vars = context.vars ?? {};
      const parsed = parseVars(vars);

      // skipCache: true ensures every eval run triggers a live Claude call
      const result = await analyzeTranscript({
        transcript: parsed.transcript,
        focusMetricKey: parsed.focusMetricKey,
        pronunciationSummary: parsed.pronunciationSummary,
        promptUsed: parsed.promptUsed,
        skipCache: true,
      });

      // Extract the 7 judged metrics from the full metrics array
      const scoreMap: Partial<MetricScoreMap> = {};
      for (const metric of result.metrics) {
        if (isJudgedMetricKey(metric.key)) {
          scoreMap[metric.key] = metric.score;
        }
      }

      await persistJudgeRuns(
        { goldenId: parsed.goldenId, modelPin: parsed.modelPin, promptHash: parsed.promptHash, runIndex: parsed.runIndex },
        scoreMap,
      );

      return { output: JSON.stringify(scoreMap) };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return { error: message };
    }
  }
}
