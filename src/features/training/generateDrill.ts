// Generates personalized drill prompts — template path for precision/conclusion, Haiku for other types

import { getAnthropicClient } from '@/lib/ai/client';
import type { DrillPrompt, DrillType } from './training.types';

const HAIKU_MODEL = 'claude-haiku-4-5-20251001';

interface GenerateDrillParams {
  drillType: DrillType;
  metricKey: string;
  recentExamples: string[];
  focusPattern: string;
  /** Session topic label when available (conclusion drill) */
  intentLabel?: string | null;
  /** Full session transcript when available (conclusion / vague-phrase context) */
  sessionTranscript?: string;
}

const DRILL_TIME_LIMITS: Record<DrillType, number> = {
  rephrase: 90,
  constraint: 120,
  vocabUpgrade: 60,
  precision: 60,
  conclusion: 120,
};

// Extract a vague phrase from transcript for precision drill targeting
function extractVaguePhrase(transcript: string): string {
  const vagueMarkers = [
    'things',
    'stuff',
    'like',
    'kind of',
    'sort of',
    'a lot',
    'some people',
    'basically',
  ];
  const sentences = transcript
    .split(/[.!?]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 8);

  if (sentences.length === 0) {
    return transcript.trim().slice(0, 200) || 'your recent point';
  }

  let best = sentences[0];
  let bestScore = 0;
  const lower = (s: string) => s.toLowerCase();
  for (const sentence of sentences) {
    const l = lower(sentence);
    const score = vagueMarkers.reduce((acc, m) => acc + (l.includes(m) ? 1 : 0), 0);
    if (score > bestScore) {
      bestScore = score;
      best = sentence;
    }
  }

  return best ?? transcript.trim().slice(0, 200);
}

// Extract session topic from intent label or first sentence of transcript
function extractSessionTopic(session: { intentLabel: string | null; transcript: string }): string {
  if (session.intentLabel && session.intentLabel.trim().length > 0) {
    return session.intentLabel.trim();
  }
  const firstSentence = session.transcript.split(/[.!?]/)[0]?.trim();
  if (firstSentence && firstSentence.length > 0) return firstSentence;
  return 'your chosen topic';
}

function buildPrecisionPrompt(params: GenerateDrillParams): DrillPrompt {
  const transcript =
    params.sessionTranscript?.trim() ||
    params.recentExamples.join(' ').trim() ||
    'your recent point';
  const vaguePhrase = extractVaguePhrase(transcript);
  return {
    drillType: 'precision',
    metricKey: params.metricKey,
    prompt: `You said: "${vaguePhrase}". Now say it more precisely. Who exactly? How many? When? Be specific — replace every vague word with a concrete detail.`,
    sourceExample: vaguePhrase,
    timeLimit: DRILL_TIME_LIMITS.precision,
  };
}

function buildConclusionPrompt(params: GenerateDrillParams): DrillPrompt {
  const transcript =
    params.sessionTranscript?.trim() ||
    params.recentExamples.join(' ').trim() ||
    '';
  const topic = extractSessionTopic({
    intentLabel: params.intentLabel ?? null,
    transcript,
  });
  return {
    drillType: 'conclusion',
    metricKey: params.metricKey,
    prompt: `Explain "${topic}" and end with a strong conclusion. Close with one of these starters: "In summary...", "The key takeaway is...", or "What this means is...". Make your ending memorable.`,
    sourceExample: null,
    timeLimit: DRILL_TIME_LIMITS.conclusion,
  };
}

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

  if (drillType === 'precision') {
    return buildPrecisionPrompt(params);
  }
  if (drillType === 'conclusion') {
    return buildConclusionPrompt(params);
  }

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
