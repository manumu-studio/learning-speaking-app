// Server-side Claude call that converts Azure pronunciation scores into 2-3 coaching tips
'use server';

import { z } from 'zod';
import { getAnthropicClient } from '@/lib/ai/client';
import type { PronunciationTipsInput, PronunciationTip } from './pronunciationTips.types';

const TipsResponseSchema = z.object({
  tips: z
    .array(
      z.object({
        focus: z.string().max(60),
        instruction: z.string().max(200),
      })
    )
    .min(1)
    .max(3),
});

const SYSTEM_PROMPT = `You are a pronunciation coach for English language learners.
Given Azure Speech Assessment scores and phoneme data, produce 2-3 short, specific, actionable coaching tips.

Rules:
- Write for a B2-level English learner, not a linguist
- Never use IPA symbols or linguistic jargon in the instruction text
- Each tip must have a focus (what area, max 60 chars) and an instruction (what to do, max 200 chars)
- Ground each tip in the actual data — do not give generic advice
- If accuracy >= 80 everywhere, give 1 positive tip and 1 refinement tip
- Respond ONLY with valid JSON matching: { "tips": [{ "focus": "...", "instruction": "..." }] }`;

/** Converts Azure pronunciation scores into 2-3 actionable coaching tips via Claude Haiku. */
export async function generatePronunciationTips(
  input: PronunciationTipsInput
): Promise<PronunciationTip[]> {
  const client = getAnthropicClient();

  const userMessage = `
Pronunciation Assessment Data:
- Overall score: ${input.pronScore}/100
- Accuracy: ${input.accuracyScore}/100
- Fluency: ${input.fluencyScore}/100
- Completeness: ${input.completenessScore}/100
- Prosody: ${input.prosodyScore}/100
- Speaking rate: ${input.speakingRateWpm} words per minute (ideal range: 110-140)

Weak words (accuracy < 70):
${
  input.weakWords.length > 0
    ? input.weakWords
        .map((w) => `- "${w.word}": accuracy ${w.accuracyScore}/100, error type: ${w.errorType}`)
        .join('\n')
    : '- None'
}

Top phoneme errors:
${input.topWeakPhonemes.length > 0 ? input.topWeakPhonemes.map((p) => `- /${p}/`).join('\n') : '- None detected'}

L1 accent patterns detected: ${input.l1Tags.length > 0 ? input.l1Tags.join(', ') : 'None'}
`.trim();

  const response = await client.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 400,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userMessage }],
  });

  const firstContent = response.content[0];
  if (firstContent === undefined || firstContent.type !== 'text') {
    return [];
  }

  try {
    const parsed = TipsResponseSchema.safeParse(JSON.parse(firstContent.text));
    if (!parsed.success) return [];
    return parsed.data.tips;
  } catch {
    return [];
  }
}
