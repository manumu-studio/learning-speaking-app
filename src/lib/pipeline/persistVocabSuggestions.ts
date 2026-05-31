// Persist vocabulary suggestions from Claude analysis to the VocabSuggestion table

import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

export type VocabSuggestionItem = {
  word: string;
  meaning: string;
  exampleSentence: string;
};

export async function persistVocabSuggestions(
  userId: string,
  sessionId: string,
  suggestions: VocabSuggestionItem[],
): Promise<number> {
  if (suggestions.length === 0) return 0;

  const normalized = suggestions.map((s) => ({
    userId,
    word: s.word.toLowerCase().trim(),
    meaning: s.meaning,
    exampleSentence: s.exampleSentence,
    suggestedInSessionId: sessionId,
  }));

  const result = await prisma.vocabSuggestion.createMany({
    data: normalized,
    skipDuplicates: true,
  });

  logger.info(
    { sessionId, userId, suggested: suggestions.length, inserted: result.count },
    'Persisted vocab suggestions',
  );

  return result.count;
}
