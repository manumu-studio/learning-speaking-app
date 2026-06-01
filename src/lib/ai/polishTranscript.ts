// Post-process Whisper transcript: add punctuation, capitalization, and paragraph breaks

import { getAnthropicClient } from '@/lib/ai/client';
import { logger } from '@/lib/logger';

/**
 * Send raw transcript through Claude Haiku to add proper punctuation,
 * capitalization, and paragraph separation. Returns the polished text.
 * Falls back to original text on any error.
 */
export async function polishTranscript(rawText: string): Promise<string> {
  if (rawText.trim().length === 0) return rawText;

  try {
    const client = getAnthropicClient();

    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 4096,
      messages: [
        {
          role: 'user',
          content: `You are a transcript editor. The following is a raw speech-to-text transcription that may be missing punctuation, capitalization, or paragraph breaks.

Your job:
1. Add proper punctuation (periods, commas, question marks, exclamation marks)
2. Fix capitalization (sentence starts, proper nouns)
3. Separate into paragraphs where the speaker changes topic or takes a natural pause
4. Do NOT change any words — only add punctuation, fix letter casing, and add paragraph breaks
5. Do NOT add any commentary, notes, or explanations — return ONLY the polished transcript

Raw transcript:
${rawText}`,
        },
      ],
    });

    const content = message.content[0];
    if (content?.type !== 'text' || content.text.trim().length === 0) {
      return rawText;
    }

    logger.info(
      { originalLength: rawText.length, polishedLength: content.text.length },
      'Polished transcript',
    );

    return content.text.trim();
  } catch (error) {
    logger.warn(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      'Transcript polish failed — using raw text',
    );
    return rawText;
  }
}
