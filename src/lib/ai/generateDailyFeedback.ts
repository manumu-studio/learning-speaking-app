// Generates a personalized 2-3 sentence daily coaching note via Claude Haiku
import { getAnthropicClient } from '@/lib/ai/client';
import { logger } from '@/lib/logger';

const FALLBACK_FEEDBACK = 'Great work today! Keep building those reps.';

interface DailyFeedbackInput {
  deliveryAvg: number;
  languageAvg: number;
  pronunciationAvg: number;
  sessionCount: number;
  newWords: string[];
  metricHighlight?: { key: string; score: number } | undefined;
  metricLow?: { key: string; score: number } | undefined;
}

const SYSTEM_PROMPT = `You are a supportive speaking coach with a gym-coach tone. Generate a brief daily coaching note (2-3 sentences max) for a language learner based on their daily metrics.

Rules:
- Use encouraging, progress-focused language (like a gym coach)
- Never use red/error/failure language — frame everything as growth opportunities
- Reference specific scores and words when available
- Keep it conversational and motivating
- Mention 1 strength and 1 area to focus on next
- Do NOT use markdown or bullet points — plain text only`;

function buildUserPrompt(input: DailyFeedbackInput): string {
  const lines = [
    `Today's summary:`,
    `- Sessions completed: ${input.sessionCount}`,
    `- Delivery score: ${input.deliveryAvg.toFixed(1)}/10`,
    `- Language score: ${input.languageAvg.toFixed(1)}/10`,
    `- Pronunciation score: ${input.pronunciationAvg.toFixed(1)}/10`,
  ];

  if (input.newWords.length > 0) {
    lines.push(`- New vocabulary learned: ${input.newWords.join(', ')}`);
  }

  if (input.metricHighlight) {
    lines.push(`- Best metric: ${input.metricHighlight.key} (${input.metricHighlight.score}/10)`);
  }

  if (input.metricLow) {
    lines.push(`- Area to grow: ${input.metricLow.key} (${input.metricLow.score}/10)`);
  }

  lines.push('', 'Write 2-3 sentences of coaching feedback.');

  return lines.join('\n');
}

/**
 * Calls Claude Haiku to generate a personalized daily coaching note.
 * Returns a fallback string on any failure — never throws.
 */
export async function generateDailyFeedback(input: DailyFeedbackInput): Promise<string> {
  try {
    const client = getAnthropicClient();
    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 256,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: buildUserPrompt(input) }],
    });

    const content = message.content[0];
    if (content?.type !== 'text' || content.text.trim().length === 0) {
      return FALLBACK_FEEDBACK;
    }

    return content.text.trim();
  } catch (error) {
    logger.error({ err: error }, 'Failed to generate daily feedback');
    return FALLBACK_FEEDBACK;
  }
}
