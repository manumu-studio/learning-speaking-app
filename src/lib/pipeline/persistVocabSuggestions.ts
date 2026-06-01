// Persist vocabulary suggestions from Claude analysis to the VocabSuggestion table

import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

export type VocabSuggestionItem = {
  word: string;
  meaning: string;
  exampleSentence: string;
  type?: 'word' | 'collocation' | 'phrase';
  domain?: 'general' | 'business' | 'tech' | 'academic' | 'medical' | 'legal';
  frequencyBand?: 'high' | 'mid' | 'low' | 'rare';
};

/** Inserts new VocabSuggestion rows for a user, skipping duplicates, and returns the count of rows actually inserted. */
export async function persistVocabSuggestions(
  userId: string,
  sessionId: string,
  suggestions: VocabSuggestionItem[],
): Promise<number> {
  if (suggestions.length === 0) return 0;

  const now = new Date();
  const nextReview = new Date(now);
  nextReview.setDate(nextReview.getDate() + 1);

  const normalized = suggestions.map((s) => ({
    userId,
    word: s.word.toLowerCase().trim(),
    meaning: s.meaning,
    exampleSentence: s.exampleSentence,
    type: s.type ?? 'word',
    domain: s.domain ?? 'general',
    frequencyBand: s.frequencyBand ?? 'mid',
    nextReviewAt: nextReview,
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
