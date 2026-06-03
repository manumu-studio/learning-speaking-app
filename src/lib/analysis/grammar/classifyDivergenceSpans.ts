// Calls Claude Haiku to classify divergence spans as grammar errors, self-corrections, or ASR artifacts
import { getAnthropicClient } from '@/lib/ai/client';
import { grammarFlagsResponseSchema } from './grammarFlagSchema';
import { buildGrammarSystemPrompt, buildGrammarUserPrompt } from './grammarPrompt';
import type { GrammarFlag } from './grammar.types';
import type { DivergenceSpan } from '@/lib/analysis/divergence';

interface ClassifyOptions {
  readonly normalizedTranscript: string;
  readonly verbatimTranscript: string;
  readonly divergenceSpans: readonly DivergenceSpan[];
  readonly corpusEvidence: string | null;
}

export async function classifyDivergenceSpans(options: ClassifyOptions): Promise<GrammarFlag[]> {
  if (options.divergenceSpans.length === 0) return [];

  const client = getAnthropicClient();

  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 2048,
    system: buildGrammarSystemPrompt(),
    messages: [{ role: 'user', content: buildGrammarUserPrompt(options) }],
  });

  const textBlock = response.content.find((block) => block.type === 'text');
  if (!textBlock || textBlock.type !== 'text') {
    throw new Error('Grammar classifier returned no text content');
  }

  // Strip markdown code fences if Claude wraps the response
  let jsonText = textBlock.text.trim();
  if (jsonText.startsWith('```')) {
    jsonText = jsonText.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
  }

  const parsed = grammarFlagsResponseSchema.parse(JSON.parse(jsonText));
  return parsed.flags;
}
