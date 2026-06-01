// Generate reading practice text that targets the user's weak phonemes and vocabulary

import { z } from 'zod';
import { getAnthropicClient } from '@/lib/ai/client';
import { logger } from '@/lib/logger';

const ReadingPracticeResponseSchema = z.object({
  text: z.string(),
  targetPhonemes: z.array(z.string()),
  targetWords: z.array(z.string()),
});

export type ReadingPracticeResponse = z.infer<typeof ReadingPracticeResponseSchema>;

export type ReadingPracticeInput = {
  weakPhonemes: string[];
  weakVocabulary: string[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
};

/** Generates a short pronunciation-focused reading practice text targeting weak phonemes and vocabulary. */
export async function generateReadingPractice(
  input: ReadingPracticeInput,
): Promise<ReadingPracticeResponse> {
  const client = getAnthropicClient();

  const phonemeList = input.weakPhonemes.length > 0
    ? `Weak phonemes to target: ${input.weakPhonemes.join(', ')}`
    : 'No specific phonemes to target.';

  const vocabList = input.weakVocabulary.length > 0
    ? `Vocabulary words to include naturally: ${input.weakVocabulary.join(', ')}`
    : 'No specific vocabulary to target.';

  const difficultyGuide = {
    beginner: 'Use simple sentence structures. Short sentences (8-12 words each). Common, everyday vocabulary.',
    intermediate: 'Use varied sentence structures with subordinate clauses. Mix of simple and complex vocabulary.',
    advanced: 'Use sophisticated sentence structures. Include advanced vocabulary and idiomatic expressions. Natural academic or professional tone.',
  };

  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 512,
    messages: [
      {
        role: 'user',
        content: `Generate a short reading practice text (2-4 sentences) for an English pronunciation learner.

${phonemeList}
${vocabList}
Difficulty: ${input.difficulty}
${difficultyGuide[input.difficulty]}

Design the text so it naturally contains words with the target phonemes. The text should be coherent and topically interesting.

Respond with ONLY valid JSON (no markdown fences):
{
  "text": "The reading practice text here.",
  "targetPhonemes": ["list", "of", "phonemes", "actually", "present"],
  "targetWords": ["list", "of", "target", "vocab", "included"]
}`,
      },
    ],
  });

  const raw = message.content[0];
  if (raw?.type !== 'text') {
    throw new Error('Claude returned non-text response for reading practice');
  }

  const cleaned = raw.text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
  const parsed: unknown = JSON.parse(cleaned);
  const result = ReadingPracticeResponseSchema.parse(parsed);

  logger.info(
    { phonemes: input.weakPhonemes.length, vocab: input.weakVocabulary.length, difficulty: input.difficulty },
    'Generated reading practice text',
  );

  return result;
}
