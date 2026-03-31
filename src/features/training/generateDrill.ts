// Generates personalized drill prompts using Claude Haiku based on user's transcript examples

import { getAnthropicClient } from '@/lib/ai/client';
import type { DrillPrompt, DrillType } from './training.types';

const HAIKU_MODEL = 'claude-haiku-4-5-20251001';

interface GenerateDrillParams {
  drillType: DrillType;
  metricKey: string;
  recentExamples: string[];
  focusPattern: string;
}

const DRILL_TIME_LIMITS: Record<DrillType, number> = {
  rephrase: 90,
  constraint: 120,
  vocabUpgrade: 60,
  precision: 90,
  conclusion: 240,
};

const DRILL_TEMPLATES: Record<DrillType, string> = {
  rephrase: `The user tends to overuse certain connectors and repeat sentence structures.
Here are examples from their recent speech:
{examples}

The pattern to address: {focusPattern}

Generate a drill prompt that:
1. Quotes ONE specific sentence from their examples
2. Asks them to rephrase it WITHOUT using the overused connector/structure
3. Suggests 2-3 alternative connectors they could try
Keep the prompt to 2-3 sentences. Be encouraging, not critical.`,

  constraint: `The user needs more structural variety in their speech.
Here are examples from their recent speech:
{examples}

The pattern to address: {focusPattern}

Generate a drill prompt that:
1. Provides a specific sentence structure template (e.g., "Although X, Y because Z")
2. Asks them to explain ONE of their recent ideas using this exact structure
3. References their actual topic so it feels relevant
Keep the prompt to 2-3 sentences. Be encouraging.`,

  vocabUpgrade: `The user repeats certain words or uses imprecise vocabulary.
Here are examples from their recent speech:
{examples}

The pattern to address: {focusPattern}

Generate a drill prompt that:
1. Identifies ONE specific repeated/imprecise word from their examples
2. Provides 3 more precise alternatives
3. Asks them to re-explain their point using one of the alternatives
Keep the prompt to 2-3 sentences.`,

  precision: `The user makes vague statements or uses filler language.
Here are examples from their recent speech:
{examples}

The pattern to address: {focusPattern}

Generate a drill prompt that:
1. Quotes ONE vague or filler-heavy sentence from their examples
2. Asks them to make it specific and concrete
3. Gives a brief hint about what "specific" means in this context
Keep the prompt to 2-3 sentences.`,

  conclusion: `The user tends to trail off or leave arguments unfinished.
Here are examples from their recent speech:
{examples}

The pattern to address: {focusPattern}

Generate a drill prompt that:
1. References the topic they were discussing
2. Asks them to deliver a strong 2-3 sentence conclusion
3. Reminds them to tie back to their main point
Keep the prompt to 2-3 sentences.`,
};

export async function generateDrill(params: GenerateDrillParams): Promise<DrillPrompt> {
  const { drillType, metricKey, recentExamples, focusPattern } = params;
  const client = getAnthropicClient();

  const template = DRILL_TEMPLATES[drillType];
  const examplesText = recentExamples.map((ex, i) => `${i + 1}. "${ex}"`).join('\n');

  const filledTemplate = template
    .replace('{examples}', examplesText)
    .replace('{focusPattern}', focusPattern);

  const response = await client.messages.create({
    model: HAIKU_MODEL,
    max_tokens: 300,
    system: `You are a supportive English speaking coach. Generate a short, personalized drill prompt for the user. Output ONLY the drill prompt text — no labels, no metadata, no markdown. Use a warm, gym-coach tone.`,
    messages: [
      {
        role: 'user',
        content: filledTemplate,
      },
    ],
  });

  let promptText = '';
  for (const block of response.content) {
    if (block.type === 'text') {
      promptText += block.text;
    }
  }

  const sourceExample = recentExamples[0] ?? null;

  return {
    drillType,
    metricKey,
    prompt: promptText,
    sourceExample,
    timeLimit: DRILL_TIME_LIMITS[drillType],
  };
}
