// Helpers for GET /api/users/me/reading-practice-sessions — DB queries and session card mapping
import { prisma } from '@/lib/prisma';
import { aggregatePhonemes } from '@/lib/pronunciation/aggregatePhonemes';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type PronWord = {
  word: string;
  accuracyScore: number;
  errorType: string;
  phonemes: unknown;
};

type VocabRow = {
  word: string;
  meaning: string;
  firstUsedInSessionId: string | null;
};

type RawSession = {
  id: string;
  intentLabel: string | null;
  createdAt: Date;
  pronunciationReport: {
    pronScore: number;
    words: PronWord[];
  } | null;
  suggestedVocab: VocabRow[];
};

export type SessionCard = {
  id: string;
  workoutNumber: number;
  intentLabel: string;
  createdAt: string;
  pronScore: number | null;
  weakPhonemes: ReturnType<typeof aggregatePhonemes>;
  mispronounced: Array<{ word: string; accuracyScore: number; errorType: string }>;
  vocab: Array<{ word: string; meaning: string; adopted: boolean }>;
};

// ---------------------------------------------------------------------------
// DB queries
// ---------------------------------------------------------------------------

/** Fetch last 30 DONE sessions that have a pronunciationReport for a user. */
export async function fetchSessionsWithPronunciation(userId: string): Promise<RawSession[]> {
  return prisma.speakingSession.findMany({
    where: {
      userId,
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
  }) satisfies Promise<RawSession[]>;
}

/** Count DONE sessions before a given date for workout numbering. */
export async function fetchWorkoutCountBefore(userId: string, before: Date): Promise<number> {
  return prisma.speakingSession.count({
    where: {
      userId,
      status: 'DONE',
      createdAt: { lt: before },
    },
  });
}

/** Fetch unadopted vocab suggestions across all sessions for a user (most recent 15). */
export async function fetchUnadoptedVocab(
  userId: string,
): Promise<Array<{ word: string; meaning: string }>> {
  return prisma.vocabSuggestion.findMany({
    where: {
      userId,
      firstUsedInSessionId: null,
    },
    orderBy: { createdAt: 'desc' },
    take: 15,
    select: {
      word: true,
      meaning: true,
    },
  });
}

// ---------------------------------------------------------------------------
// Mapping
// ---------------------------------------------------------------------------

/** Build a single session card with phoneme aggregation and mispronounced word list. */
export function buildSessionCard(
  session: RawSession,
  workoutNumber: number,
  allWords: Array<{ word: string; phonemes: unknown }>,
): SessionCard {
  const words = session.pronunciationReport?.words ?? [];
  const wordData = words.map((w) => ({ word: w.word, phonemes: w.phonemes }));
  const weakPhonemes = aggregatePhonemes(wordData);
  allWords.push(...wordData);

  const mispronounced = words
    .filter((w) => w.accuracyScore < 60 && w.errorType !== 'None')
    .sort((a, b) => a.accuracyScore - b.accuracyScore)
    .slice(0, 8)
    .map((w) => ({
      word: w.word,
      accuracyScore: Math.round(w.accuracyScore),
      errorType: w.errorType,
    }));

  const vocab = session.suggestedVocab.map((v) => ({
    word: v.word,
    meaning: v.meaning,
    adopted: v.firstUsedInSessionId !== null,
  }));

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
}
