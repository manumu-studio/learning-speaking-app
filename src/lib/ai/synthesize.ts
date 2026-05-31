// Claude Haiku synthesis pass — deduplicates and unifies per-chunk insights into session-level analysis
import { z } from 'zod';
import { getAnthropicClient } from '@/lib/ai/client';
import { insightSchema, metricSchema } from '@/lib/ai/analyze';
import { logger } from '@/lib/logger';

export interface ChunkInsightInput {
  chunkIndex: number;
  startSecs: number;
  endSecs: number;
  insights: unknown[];
}

export interface SynthesisInput {
  stitchedTranscript: string;
  chunks: ChunkInsightInput[];
  focusMetricKey: string | null;
  promptUsed: string | null;
}

export interface SynthesisResult {
  insights: z.infer<typeof insightSchema>[];
  metrics: z.infer<typeof metricSchema>[];
  focusNext: string;
  summary: string;
  intentLabel: string;
}

const synthesisResponseSchema = z.object({
  insights: z.array(insightSchema).max(5),
  metrics: z.array(metricSchema),
  focusNext: z.string(),
  summary: z.string().max(300),
  intentLabel: z.string().max(50),
});

function buildSynthesisPrompt(input: SynthesisInput): string {
  const chunkSummaries = input.chunks
    .map((chunk) => {
      const parsedInsights = Array.isArray(chunk.insights) ? chunk.insights : [];
      return `Chunk ${chunk.chunkIndex} (${chunk.startSecs}s–${chunk.endSecs}s): ${JSON.stringify(parsedInsights)}`;
    })
    .join('\n');

  const focusInstruction = input.focusMetricKey
    ? `The user is focusing on improving: ${input.focusMetricKey}. Weight insights related to this metric more heavily.`
    : '';

  return `You are an English speaking coach synthesising analysis from a multi-chunk recording session.

FULL SESSION TRANSCRIPT:
${input.stitchedTranscript}

PER-CHUNK INSIGHTS (may contain duplicates and boundary artifacts):
${chunkSummaries}

YOUR TASK:
1. Deduplicate patterns that appear across multiple chunks — merge them into one insight with the highest frequency count.
2. Filter out insights that look like transcription boundary artifacts (e.g. a pattern that only appears in one chunk and consists of a sentence fragment).
3. Detect cross-chunk patterns that are MORE significant because they persist across the full session.
4. Produce up to 5 final insights covering the full session.
5. Score all 6 language metrics (connectorRepetition, structuralVariety, vocabularyPrecision, verbAccuracy, argumentClosure, fillerUsage) using the complete transcript, not per-chunk data.
6. Write a 1–2 sentence summary of the full session, an intentLabel (3–5 words), and a focusNext recommendation.

${focusInstruction}

RESPOND WITH VALID JSON ONLY — no markdown, no commentary:
{
  "insights": [...],
  "metrics": [...],
  "focusNext": "...",
  "summary": "...",
  "intentLabel": "..."
}`;
}

export async function synthesizeAnalysis(input: SynthesisInput): Promise<SynthesisResult> {
  const client = getAnthropicClient();

  const message = await client.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 2048,
    messages: [
      {
        role: 'user',
        content: buildSynthesisPrompt(input),
      },
    ],
  });

  const firstBlock = message.content[0];
  if (!firstBlock || firstBlock.type !== 'text') {
    throw new Error('Unexpected Claude response structure in synthesis pass');
  }

  const text = firstBlock.text.trim();

  const jsonText = text.startsWith('```')
    ? text.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim()
    : text;

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText);
  } catch {
    logger.error({ rawResponse: text }, 'Claude synthesis response was not valid JSON');
    throw new Error('Claude synthesis returned invalid JSON');
  }

  const result = synthesisResponseSchema.safeParse(parsed);
  if (!result.success) {
    logger.error(
      { issues: result.error.issues, rawResponse: text },
      'Claude synthesis response failed schema validation',
    );
    throw new Error('Claude synthesis response failed schema validation');
  }

  return result.data;
}
