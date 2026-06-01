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

export interface VocabSuggestionItem {
  word: string;
  meaning: string;
  exampleSentence: string;
}

export interface SynthesisResult {
  insights: z.infer<typeof insightSchema>[];
  metrics: z.infer<typeof metricSchema>[];
  focusNext: string;
  summary: string;
  intentLabel: string;
  vocabularySuggestions: VocabSuggestionItem[];
}

const vocabSuggestionSchema = z.object({
  word: z.string(),
  meaning: z.string(),
  exampleSentence: z.string(),
});

const synthesisResponseSchema = z.object({
  insights: z.array(insightSchema).max(5),
  metrics: z.array(metricSchema),
  focusNext: z.string(),
  summary: z.string().max(500),
  intentLabel: z.string().max(80),
  vocabularySuggestions: z.array(vocabSuggestionSchema).max(3).optional(),
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
7. Produce a vocabularySuggestions array with exactly 2-3 items. Choose words that are genuinely useful upgrades — not obscure synonyms. Each word should have a meaning and an example sentence showing natural usage.

${focusInstruction}

RESPOND WITH VALID JSON ONLY — no markdown, no commentary.
Be CONCISE: each insight detail should be 1-2 sentences max, each suggestion 1-2 sentences, summary under 200 characters.
Use null for optional fields you want to omit (frequency, severity, examples, suggestion, confidence).

{
  "insights": [
    {
      "category": "grammar|vocabulary|structure",
      "pattern": "Short label",
      "detail": "Explanation",
      "frequency": 2,
      "severity": "high|medium|low",
      "examples": ["example 1 → correction 1"],
      "suggestion": "How to improve"
    }
  ],
  "metrics": [
    { "key": "connectorRepetition", "level": "low|medium|high", "score": 7, "note": "Brief note" }
  ],
  "focusNext": "One sentence recommendation",
  "summary": "1-2 sentence session summary",
  "intentLabel": "3-5 word topic label",
  "vocabularySuggestions": [
    { "word": "articulate", "meaning": "expressing oneself clearly", "exampleSentence": "She articulated her position with confidence." }
  ]
}`;
}

export async function synthesizeAnalysis(input: SynthesisInput): Promise<SynthesisResult> {
  const client = getAnthropicClient();

  const message = await client.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 4096,
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

  return {
    ...result.data,
    vocabularySuggestions: result.data.vocabularySuggestions ?? [],
  };
}
