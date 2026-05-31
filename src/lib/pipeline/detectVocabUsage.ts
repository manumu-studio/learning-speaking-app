// Detect when a user's transcript contains previously suggested vocabulary words

import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

/**
 * Generate common English word form variants for matching.
 * Handles: plurals, past tense, progressive, comparative.
 */
export function wordForms(word: string): string[] {
  const base = word.toLowerCase().trim();
  const forms = [base];

  if (base.endsWith('y')) {
    forms.push(base.slice(0, -1) + 'ies');
    forms.push(base.slice(0, -1) + 'ied');
  } else if (base.endsWith('e')) {
    forms.push(base + 's');
    forms.push(base + 'd');
    forms.push(base.slice(0, -1) + 'ing');
    forms.push(base + 'r');
    forms.push(base + 'st');
  } else if (base.endsWith('s') || base.endsWith('sh') || base.endsWith('ch') || base.endsWith('x') || base.endsWith('z')) {
    forms.push(base + 'es');
    forms.push(base + 'ed');
    forms.push(base + 'ing');
  } else {
    forms.push(base + 's');
    forms.push(base + 'ed');
    forms.push(base + 'ing');
    forms.push(base + 'er');
    forms.push(base + 'est');
  }

  return forms;
}

/**
 * Check a transcript against the user's pending vocab suggestions.
 * Marks any matched suggestions with the current session ID and timestamp.
 */
export async function detectVocabUsage(
  userId: string,
  sessionId: string,
  transcript: string,
): Promise<number> {
  const pending = await prisma.vocabSuggestion.findMany({
    where: { userId, firstUsedInSessionId: null },
    select: { id: true, word: true },
  });

  if (pending.length === 0) return 0;

  const transcriptLower = transcript.toLowerCase();
  const transcriptWords = new Set(transcriptLower.split(/\s+/));

  const matchedIds: string[] = [];

  for (const suggestion of pending) {
    const forms = wordForms(suggestion.word);
    const found = forms.some((form) => transcriptWords.has(form));

    if (found) {
      matchedIds.push(suggestion.id);
    }
  }

  if (matchedIds.length === 0) {
    logger.debug({ sessionId, userId, checked: pending.length }, 'No vocab matches in transcript');
    return 0;
  }

  const now = new Date();
  await prisma.vocabSuggestion.updateMany({
    where: { id: { in: matchedIds } },
    data: { firstUsedInSessionId: sessionId, firstUsedAt: now },
  });

  logger.info(
    { sessionId, userId, matched: matchedIds.length, checked: pending.length },
    'Detected vocab usage in transcript',
  );

  return matchedIds.length;
}
