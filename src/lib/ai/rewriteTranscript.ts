// Rewrite transcript with vocabulary upgrades using Claude Haiku
/* eslint-disable max-lines-per-function */

import { getAnthropicClient } from '@/lib/ai/client';
import { logger } from '@/lib/logger';
import { isRecord } from '@/lib/typeGuards';

const MIN_WORD_COUNT = 20;

export interface VocabWord {
  word: string;
  meaning: string;
  exampleSentence: string;
}

export interface RewriteResult {
  improvedText: string;
  wordsUsed: string[];
}

/** Rewrites a transcript to naturally incorporate vocabulary suggestions, preserving the speaker's original meaning. */
export async function rewriteTranscript(
  originalText: string,
  vocabularySuggestions: VocabWord[],
): Promise<RewriteResult | null> {
  const wordCount = originalText.split(/\s+/).filter(Boolean).length;
  if (wordCount < MIN_WORD_COUNT) {
    logger.info({ wordCount }, 'Transcript too short for rewrite — skipping');
    return null;
  }

  if (vocabularySuggestions.length === 0) {
    return null;
  }

  const vocabList = vocabularySuggestions
    .map((v) => `- "${v.word}" (${v.meaning}). Example: ${v.exampleSentence}`)
    .join('\n');

  try {
    const client = getAnthropicClient();

    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 4096,
      messages: [
        {
          role: 'user',
          content: `You are a writing coach. The speaker recorded themselves speaking English. Below is their polished transcript and a list of vocabulary upgrades.

Your job:
1. Rewrite the transcript so it naturally incorporates the suggested vocabulary words
2. Keep the speaker's original meaning, structure, and tone — only upgrade word choice
3. Do NOT add new ideas, do NOT change the argument, do NOT add filler
4. If a suggested word doesn't fit naturally, skip it — never force a word in
5. Return ONLY valid JSON — no markdown, no code fences, no commentary

Vocabulary suggestions:
${vocabList}

Original transcript:
${originalText}

Respond with this exact JSON structure:
{"improvedText": "the full rewritten transcript", "wordsUsed": ["word1", "word2"]}`,
        },
      ],
    });

    const content = message.content[0];
    if (content?.type !== 'text' || content.text.trim().length === 0) {
      logger.warn('Rewrite returned empty content');
      return null;
    }

    const raw = content.text.trim();
    const cleaned = raw.replace(/^```(?:json)?\s*/u, '').replace(/\s*```$/u, '');

    const parsed: unknown = JSON.parse(cleaned);

    if (
      !isRecord(parsed) ||
      !('improvedText' in parsed) ||
      !('wordsUsed' in parsed)
    ) {
      logger.warn({ raw }, 'Rewrite response missing required fields');
      return null;
    }

    const improvedText = parsed['improvedText'];
    const rawWordsUsed = parsed['wordsUsed'];

    if (typeof improvedText !== 'string' || !Array.isArray(rawWordsUsed)) {
      logger.warn('Rewrite response has wrong field types');
      return null;
    }

    const wordsUsed = rawWordsUsed.filter(
      (w): w is string => typeof w === 'string',
    );

    if (improvedText.trim().length === 0) {
      logger.warn('Rewrite returned empty improved text');
      return null;
    }

    logger.info(
      { wordsUsed, originalLength: originalText.length, improvedLength: improvedText.length },
      'Transcript rewritten with vocab upgrades',
    );

    return { improvedText, wordsUsed };
  } catch (error) {
    logger.warn(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      'Transcript rewrite failed — skipping',
    );
    return null;
  }
}
