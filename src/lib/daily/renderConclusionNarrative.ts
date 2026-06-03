// Renders structured daily conclusion data into a coaching narrative + topic sentence via Claude Haiku

import { z } from 'zod';
import { getAnthropicClient } from '@/lib/ai/client';
import { logger } from '@/lib/logger';

const FALLBACK_FEEDBACK = 'Great work today! Keep building those reps.';

export interface NarrativeInput {
  pillarScores: { delivery: number; language: number; pronunciation: number };
  metricDeltas: { delivery: number | null; language: number | null; pronunciation: number | null };
  wins: Array<{ tag: string; detail: string }>;
  struggles: Array<{ tag: string; detail: string; count: number }>;
  intentLabels: string[];
  sessionCount: number;
  totalDurationSecs: number;
}

export interface NarrativeOutput {
  renderedFeedback: string;
  topicSentence: string;
}

const NarrativeResponseSchema = z.object({
  renderedFeedback: z.string().min(1),
  topicSentence: z.string().min(1),
});

const SYSTEM_PROMPT = `You are a supportive speaking coach with a gym-coach tone. Given a learner's daily summary, produce a JSON object with two fields:
- "renderedFeedback": a 2-3 sentence coaching note that is encouraging and progress-focused
- "topicSentence": a single sentence describing what the learner practiced today, grounded in the topics listed

Rules:
- Never use red/error/failure language — frame everything as growth opportunities
- Keep renderedFeedback conversational and motivating; reference specific scores or wins when relevant
- topicSentence must begin with "We " and reference the actual topics practiced
- Respond with valid JSON only — no markdown, no explanation, no extra text`;

function formatDelta(delta: number | null): string {
  if (delta === null) return 'no prior data';
  const sign = delta >= 0 ? '+' : '';
  return `${sign}${delta.toFixed(1)}`;
}

function buildUserPrompt(input: NarrativeInput): string {
  const { pillarScores, metricDeltas, wins, struggles, intentLabels, sessionCount, totalDurationSecs } = input;
  const totalMinutes = Math.round(totalDurationSecs / 60);

  const lines: string[] = [
    `Sessions today: ${sessionCount} (${totalMinutes} min total)`,
    '',
    'Pillar scores (0-10):',
    `  Delivery:      ${pillarScores.delivery.toFixed(1)} (${formatDelta(metricDeltas.delivery)})`,
    `  Language:      ${pillarScores.language.toFixed(1)} (${formatDelta(metricDeltas.language)})`,
    `  Pronunciation: ${pillarScores.pronunciation.toFixed(1)} (${formatDelta(metricDeltas.pronunciation)})`,
  ];

  if (wins.length > 0) {
    lines.push('', 'Wins:');
    for (const win of wins) {
      lines.push(`  - ${win.tag}: ${win.detail}`);
    }
  }

  if (struggles.length > 0) {
    lines.push('', 'Areas to work on:');
    for (const struggle of struggles) {
      lines.push(`  - ${struggle.tag} (x${struggle.count}): ${struggle.detail}`);
    }
  }

  const topicsLine =
    intentLabels.length > 0
      ? intentLabels.join(', ')
      : 'general speaking practice';

  lines.push('', `Topics covered: ${topicsLine}`);
  lines.push('', 'Return valid JSON with "renderedFeedback" and "topicSentence".');

  return lines.join('\n');
}

export function buildFallbackTopicSentence(labels: string[]): string {
  const unique = [...new Set(labels)];
  if (unique.length === 0) return 'We practiced speaking today.';
  if (unique.length === 1) return `We covered ${unique[0]}.`;

  const allButLast = unique.slice(0, -1).join(', ');
  const last = unique[unique.length - 1];
  return `We covered ${allButLast}, and ${last}.`;
}

/**
 * Calls Claude Haiku to render a coaching narrative and topic sentence from daily summary data.
 * Returns fallback values on any failure — never throws.
 */
export async function renderConclusionNarrative(input: NarrativeInput): Promise<NarrativeOutput> {
  const fallbackTopicSentence = buildFallbackTopicSentence(input.intentLabels);

  try {
    const client = getAnthropicClient();
    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 300,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: buildUserPrompt(input) }],
    });

    const content = message.content[0];
    if (content?.type !== 'text' || content.text.trim().length === 0) {
      logger.warn('renderConclusionNarrative: empty or non-text response from Haiku');
      return { renderedFeedback: FALLBACK_FEEDBACK, topicSentence: fallbackTopicSentence };
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(content.text.trim());
    } catch {
      logger.warn({ raw: content.text }, 'renderConclusionNarrative: failed to parse JSON from Haiku');
      return { renderedFeedback: FALLBACK_FEEDBACK, topicSentence: fallbackTopicSentence };
    }

    const result = NarrativeResponseSchema.safeParse(parsed);
    if (!result.success) {
      logger.warn({ issues: result.error.issues }, 'renderConclusionNarrative: response failed schema validation');
      return { renderedFeedback: FALLBACK_FEEDBACK, topicSentence: fallbackTopicSentence };
    }

    logger.info({ sessionCount: input.sessionCount }, 'renderConclusionNarrative: narrative rendered successfully');
    return result.data;
  } catch (error) {
    logger.error({ err: error }, 'renderConclusionNarrative: AI call failed');
    return { renderedFeedback: FALLBACK_FEEDBACK, topicSentence: fallbackTopicSentence };
  }
}
