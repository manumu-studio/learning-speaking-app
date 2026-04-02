// Evaluates a drill response — heuristic checks for precision/conclusion, Claude Haiku for other types

import { z } from 'zod';
import { getAnthropicClient } from '@/lib/ai/client';
import { sanitizePromptInput } from '@/lib/sanitizePromptInput';
import type { DrillFeedbackResult, DrillType } from './training.types';

const HAIKU_MODEL = 'claude-haiku-4-5-20251001';

interface EvaluateDrillParams {
  drillType: DrillType;
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

function evaluatePrecisionDrill(drillTranscript: string): DrillFeedbackResult {
  const specificitySignals = [
    /\b\d+\b/,
    /\b(January|February|March|April|May|June|July|August|September|October|November|December)\b/i,
    /\b(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\b/i,
    /\b(specifically|exactly|precisely)\b/i,
  ];
  const lower = drillTranscript.toLowerCase();
  const signalCount = specificitySignals.filter((r) => r.test(drillTranscript)).length;
  const hasVagueMarkers = ['things', 'stuff', 'kind of', 'sort of'].some((m) => lower.includes(m));
  const improved = signalCount >= 2 && !hasVagueMarkers;
  return {
    improved,
    feedback: improved
      ? 'Much more specific. Concrete details make your message clear and credible.'
      : 'Try adding specific numbers, names, or dates. Replace vague words with exact details.',
  };
}

function evaluateConclusionDrill(drillTranscript: string): DrillFeedbackResult {
  const sentences = drillTranscript.split(/[.!?]+/).filter((s) => s.trim().length > 0);
  const lastTwoSentences = sentences.slice(-2).join(' ').toLowerCase();
  const conclusionMarkers = [
    'in summary',
    'the key takeaway',
    'what this means',
    'to conclude',
    'in conclusion',
    'ultimately',
    'the bottom line',
    'all in all',
    'to sum up',
  ];
  const hasConclusion = conclusionMarkers.some((marker) => lastTwoSentences.includes(marker));
  const hasSubstance = sentences.length >= 3;
  const improved = hasConclusion && hasSubstance;
  return {
    improved,
    feedback: improved
      ? 'Strong finish. A clear conclusion anchors your entire argument.'
      : 'Try wrapping up with a definitive closing statement. Use "In summary..." or "The key takeaway is..." to signal your conclusion.',
  };
}

export async function evaluateDrill(params: EvaluateDrillParams): Promise<DrillFeedbackResult> {
  const { drillType, drillPrompt, metricKey, metricLabel } = params;
  const safeTranscript = sanitizePromptInput(params.drillTranscript);
  const safeExample =
    params.sourceExample == null ? params.sourceExample : sanitizePromptInput(params.sourceExample);

  if (!safeTranscript.trim()) {
    return {
      feedback: "No response detected. Try recording again — you've got this!",
      improved: false,
    };
  }

  if (drillType === 'precision') {
    return evaluatePrecisionDrill(safeTranscript);
  }
  if (drillType === 'conclusion') {
    return evaluateConclusionDrill(safeTranscript);
  }

  const client = getAnthropicClient();

  const sourceBlock = safeExample
    ? `\nTheir original problematic sentence was:\n"${safeExample}"\n`
    : '';

  const evaluationPrompt = `You are evaluating a speaking drill response. The user was asked to:
"${drillPrompt}"
${sourceBlock}
Their drill response was:
"${safeTranscript}"

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
