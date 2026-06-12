// API route: list user sessions with pronunciation weaknesses + vocab for reading practice library
import { auth } from '@/features/auth/auth';
import { findOrCreateUser } from '@/lib/db-utils';
import { errorResponse, successResponse } from '@/lib/api';
import { withObservability } from '@/lib/observability';
import { aggregatePhonemes } from '@/lib/pronunciation/aggregatePhonemes';
import type pino from 'pino';
import {
  fetchSessionsWithPronunciation,
  fetchWorkoutCountBefore,
  fetchUnadoptedVocab,
  buildSessionCard,
} from './route.helpers';

async function getHandler(_req: Request, { logger }: { logger: pino.Logger; requestId: string }) {
  const authSession = await auth();
  if (!authSession?.user?.externalId) {
    return errorResponse('Unauthorized', 'UNAUTHORIZED', 401);
  }

  const user = await findOrCreateUser(authSession.user.externalId, {
    email: authSession.user.email ?? undefined,
    displayName: authSession.user.name ?? undefined,
  });

  const sessions = await fetchSessionsWithPronunciation(user.id);

  const earliestDate = sessions.at(-1)?.createdAt;
  const workoutCountsBefore = earliestDate
    ? await fetchWorkoutCountBefore(user.id, earliestDate)
    : 0;

  // Collect all words for global aggregation while building per-session cards
  const allWords: Array<{ word: string; phonemes: unknown }> = [];
  const sessionCards = sessions.map((session, index) => {
    const workoutNumber = workoutCountsBefore + (sessions.length - index);
    return buildSessionCard(session, workoutNumber, allWords);
  });

  const globalWeakPhonemes = aggregatePhonemes(allWords);
  const unadoptedVocab = await fetchUnadoptedVocab(user.id);

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

export const GET = withObservability(getHandler, { route: 'users/me/reading-practice-sessions', getSession: auth });
