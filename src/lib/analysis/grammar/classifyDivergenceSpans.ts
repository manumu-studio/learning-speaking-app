// Calls Claude Haiku to classify divergence spans as grammar errors, self-corrections, or ASR artifacts
import { getAnthropicClient } from '@/lib/ai/client';
import { grammarFlagsResponseSchema } from './grammarFlagSchema';
import { buildGrammarSystemPrompt, buildGrammarUserPrompt } from './grammarPrompt';
import type { GrammarFlag } from './grammar.types';
import type { DivergenceSpan } from '@/lib/analysis/divergence';
import { logger } from '@/lib/logger';

interface ClassifyOptions {
  readonly normalizedTranscript: string;
  readonly verbatimTranscript: string;
  readonly divergenceSpans: readonly DivergenceSpan[];
  readonly corpusEvidence: string | null;
}

export async function classifyDivergenceSpans(options: ClassifyOptions): Promise<GrammarFlag[]> {
  if (options.divergenceSpans.length === 0) return [];

  logger.info({ spanCount: options.divergenceSpans.length }, 'grammar-classifier-input');

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

  let jsonText = textBlock.text.trim();
  if (jsonText.startsWith('```')) {
    jsonText = jsonText.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
  }

  let raw: unknown;
  try {
    raw = JSON.parse(jsonText);
  } catch {
    logger.error({ rawResponse: jsonText.slice(0, 500) }, 'grammar-classifier-json-failed');
    throw new Error('Grammar classifier returned invalid JSON');
  }

  const result = grammarFlagsResponseSchema.safeParse(raw);
  if (!result.success) {
    logger.error({ rawResponse: JSON.stringify(raw).slice(0, 500) }, 'grammar-classifier-parse-failed');
    throw new Error('Grammar classifier response failed schema validation');
  }

  logger.info({ flagCount: result.data.flags.length }, 'grammar-classifier-output');
  return result.data.flags;
}
