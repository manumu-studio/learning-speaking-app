// Detect when a user's transcript contains previously suggested vocabulary words

import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { autoRate } from '@/lib/srs/autoRate';
import { computeNextReview } from '@/lib/srs/sm2';

/**
 * Generates common English word form variants for fuzzy vocabulary matching.
 *
 * Handles: plurals (`-s`, `-es`, `-ies`), past tense (`-ed`, `-ied`), progressive (`-ing`),
 * and comparatives/superlatives (`-er`, `-est`). Rules are applied based on the word's ending.
 *
 * @param word - The base vocabulary word (case-insensitive; trimmed internally).
 * @returns An array of variant forms including the lowercase base form.
 * @example
 * wordForms('study') // => ['study', 'studies', 'studied']
 * wordForms('run')   // => ['run', 'runs', 'ran', 'running', 'runner', 'runnest']
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

function matchesTranscript(word: string, transcriptWords: Set<string>, transcriptLower: string): boolean {
  const isMultiWord = word.includes(' ');
  const forms = wordForms(word);

  if (isMultiWord) {
    return forms.some((form) => transcriptLower.includes(form));
  }
  return forms.some((form) => transcriptWords.has(form));
}

/**
 * Checks a transcript against the user's vocabulary suggestions and updates SRS state.
 *
 * For each `VocabSuggestion`:
 * - If the word (or any of its forms) appears in the transcript and hasn't been used before,
 *   `firstUsedInSessionId` and `firstUsedAt` are set.
 * - If the suggestion has been reviewed at least once, an automatic SM-2 rating is derived
 *   via `autoRate()` and the next interval is computed and persisted.
 *
 * All DB updates are batched in a single `$transaction`.
 *
 * @param userId - Internal user ID.
 * @param sessionId - The current session's ID (used for `firstUsedInSessionId`).
 * @param transcript - The full session transcript to search for vocabulary matches.
 * @returns The number of vocabulary words detected as newly used in this session.
 */
export async function detectVocabUsage(
  userId: string,
  sessionId: string,
  transcript: string,
): Promise<number> {
  const suggestions = await prisma.vocabSuggestion.findMany({
    where: { userId },
    select: { id: true, word: true, firstUsedInSessionId: true, reviewCount: true, interval: true, easeFactor: true, createdAt: true },
  });

  if (suggestions.length === 0) return 0;

  const transcriptLower = transcript.toLowerCase();
  const transcriptWords = new Set(transcriptLower.split(/\s+/));
  const now = new Date();

  type PrismaUpdateOp = ReturnType<typeof prisma.vocabSuggestion.update>;
  const updates: PrismaUpdateOp[] = [];
  let matchCount = 0;

  for (const suggestion of suggestions) {
    const wasUsed = matchesTranscript(suggestion.word, transcriptWords, transcriptLower);

    if (wasUsed && suggestion.firstUsedInSessionId === null) {
      updates.push(
        prisma.vocabSuggestion.update({
          where: { id: suggestion.id },
          data: { firstUsedInSessionId: sessionId, firstUsedAt: now },
        }),
      );
      matchCount++;
    }

    if (suggestion.reviewCount > 0) {
      const sessionsSince = await prisma.speakingSession.count({
        where: { userId, status: 'DONE', createdAt: { gt: suggestion.createdAt } },
      });

      const rating = autoRate({ wasUsedInSession: wasUsed, sessionsSinceSuggested: sessionsSince });

      if (rating !== null) {
        const result = computeNextReview(
          { interval: suggestion.interval, easeFactor: suggestion.easeFactor, reviewCount: suggestion.reviewCount },
          rating,
          now,
        );

        updates.push(
          prisma.vocabSuggestion.update({
            where: { id: suggestion.id },
            data: {
              interval: result.nextInterval,
              easeFactor: result.nextEaseFactor,
              nextReviewAt: result.nextReviewAt,
              reviewCount: suggestion.reviewCount + 1,
              lastReviewedAt: now,
            },
          }),
        );
      }
    }
  }

  if (updates.length > 0) {
    await prisma.$transaction(updates);
  }

  if (matchCount === 0) {
    logger.debug({ sessionId, userId, checked: suggestions.length }, 'No new vocab matches in transcript');
  } else {
    logger.info(
      { sessionId, userId, matched: matchCount, checked: suggestions.length },
      'Detected vocab usage in transcript',
    );
  }

  return matchCount;
}
