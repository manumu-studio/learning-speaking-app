// API route: list user sessions with pronunciation weaknesses + vocab for reading practice library
/* eslint-disable max-lines-per-function */

import { auth } from '@/features/auth/auth';
import { prisma } from '@/lib/prisma';
import { findOrCreateUser } from '@/lib/db-utils';
import { errorResponse, successResponse } from '@/lib/api';
import { withObservability } from '@/lib/observability';
import { aggregatePhonemes } from '@/lib/pronunciation/aggregatePhonemes';
import type pino from 'pino';

async function getHandler(_req: Request, { logger }: { logger: pino.Logger; requestId: string }) {
  const authSession = await auth();
  if (!authSession?.user?.externalId) {
    return errorResponse('Unauthorized', 'UNAUTHORIZED', 401);
  }

  const user = await findOrCreateUser(authSession.user.externalId, {
    email: authSession.user.email ?? undefined,
    displayName: authSession.user.name ?? undefined,
  });

  // Fetch sessions that have pronunciation data
  const sessions = await prisma.speakingSession.findMany({
    where: {
      userId: user.id,
      status: 'DONE',
      pronunciationReport: { isNot: null },
    },
    orderBy: { createdAt: 'desc' },
    take: 30,
    select: {
      id: true,
      intentLabel: true,
      createdAt: true,
      pronunciationReport: {
        select: {
          pronScore: true,
          words: {
            select: {
              word: true,
              accuracyScore: true,
              errorType: true,
              phonemes: true,
            },
            orderBy: { wordIndex: 'asc' },
          },
        },
      },
      suggestedVocab: {
        select: {
          word: true,
          meaning: true,
          firstUsedInSessionId: true,
        },
      },
    },
  });

  // Compute workout numbers in one query
  const sessionDates = sessions.map((s) => s.createdAt);
  const earliestDate = sessionDates.at(-1);

  let workoutCountsBefore = 0;
  if (earliestDate) {
    workoutCountsBefore = await prisma.speakingSession.count({
      where: {
        userId: user.id,
        status: 'DONE',
        createdAt: { lt: earliestDate },
      },
    });
  }

  // Collect all words across all sessions for global aggregation
  const allWords: Array<{ word: string; phonemes: unknown }> = [];

  const sessionCards = sessions.map((session, index) => {
    const words = session.pronunciationReport?.words ?? [];

    // Per-session phoneme aggregation
    const wordData = words.map((w) => ({ word: w.word, phonemes: w.phonemes }));
    const weakPhonemes = aggregatePhonemes(wordData);
    allWords.push(...wordData);

    // Mispronounced words (accuracy < 60, skip "None" error type)
    const mispronounced = words
      .filter((w) => w.accuracyScore < 60 && w.errorType !== 'None')
      .sort((a, b) => a.accuracyScore - b.accuracyScore)
      .slice(0, 8)
      .map((w) => ({
        word: w.word,
        accuracyScore: Math.round(w.accuracyScore),
        errorType: w.errorType,
      }));

    // Vocab suggestions for this session
    const vocab = session.suggestedVocab.map((v) => ({
      word: v.word,
      meaning: v.meaning,
      adopted: v.firstUsedInSessionId !== null,
    }));

    // Workout number: total DONE sessions before earliest + reverse index
    const workoutNumber = workoutCountsBefore + (sessions.length - index);

    return {
      id: session.id,
      workoutNumber,
      intentLabel: session.intentLabel ?? 'Untitled session',
      createdAt: session.createdAt.toISOString(),
      pronScore: session.pronunciationReport?.pronScore ?? null,
      weakPhonemes,
      mispronounced,
      vocab,
    };
  });

  // Global aggregation across all sessions
  const globalWeakPhonemes = aggregatePhonemes(allWords);

  // Unadopted vocab across all sessions
  const unadoptedVocab = await prisma.vocabSuggestion.findMany({
    where: {
      userId: user.id,
      firstUsedInSessionId: null,
    },
    orderBy: { createdAt: 'desc' },
    take: 15,
    select: {
      word: true,
      meaning: true,
    },
  });

  logger.info(
    { userId: user.id, sessionCount: sessionCards.length, globalPhonemes: globalWeakPhonemes.length },
    'Reading practice library fetched',
  );

  return successResponse({
    globalWeaknesses: {
      phonemes: globalWeakPhonemes,
      unadoptedVocab,
    },
    sessions: sessionCards,
  });
}

export const GET = withObservability(getHandler, { route: 'users/me/reading-practice-sessions' });
