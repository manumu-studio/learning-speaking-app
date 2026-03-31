// Evaluates a drill response using Claude Haiku — single-metric micro-feedback

import { z } from 'zod';
import { getAnthropicClient } from '@/lib/ai/client';
import type { DrillFeedbackResult } from './training.types';

const HAIKU_MODEL = 'claude-haiku-4-5-20251001';

interface EvaluateDrillParams {
  drillPrompt: string;
  sourceExample: string | null;
  drillTranscript: string;
  metricKey: string;
  metricLabel: string;
}

const feedbackSchema = z.object({
  feedback: z.string(),
  improved: z.boolean(),
});

function stripJsonFences(raw: string): string {
  return raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
}

export async function evaluateDrill(params: EvaluateDrillParams): Promise<DrillFeedbackResult> {
  const { drillPrompt, sourceExample, drillTranscript, metricKey, metricLabel } = params;

  if (!drillTranscript.trim()) {
    return {
      feedback: "No response detected. Try recording again — you've got this!",
      improved: false,
    };
  }

  const client = getAnthropicClient();

  const sourceBlock = sourceExample
    ? `\nTheir original problematic sentence was:\n"${sourceExample}"\n`
    : '';

  const evaluationPrompt = `You are evaluating a speaking drill response. The user was asked to:
"${drillPrompt}"
${sourceBlock}
Their drill response was:
"${drillTranscript}"

Evaluate ONLY whether they improved on ${metricLabel} (metric key: ${metricKey}).
Respond with JSON only, no markdown: { "feedback": "one encouraging sentence", "improved": true/false }

Rules:
- feedback must be exactly ONE sentence
- Use warm, supportive tone (gym coach, not teacher)
- Be honest but encouraging — even if not improved, acknowledge the effort
- Focus solely on ${metricLabel}, ignore other aspects`;

  const response = await client.messages.create({
    model: HAIKU_MODEL,
    max_tokens: 150,
    system: 'You are a supportive English speaking coach. Respond with valid JSON only.',
    messages: [
      {
        role: 'user',
        content: evaluationPrompt,
      },
    ],
  });

  let rawText = '';
  for (const block of response.content) {
    if (block.type === 'text') {
      rawText += block.text;
    }
  }

  try {
    const cleaned = stripJsonFences(rawText);
    const parsed: unknown = JSON.parse(cleaned);
    const validated = feedbackSchema.parse(parsed);
    return validated;
  } catch {
    return {
      feedback: 'Great effort on that drill! Keep practicing to build consistency.',
      improved: false,
    };
  }
}
