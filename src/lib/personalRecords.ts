// Personal Records detection — compares session scores against user's historical bests

import { prisma } from '@/lib/prisma';
import type { MetricKey } from '@/features/dashboard/dashboard.types';
import type { PersonalRecord, PRTimeframe } from './personalRecords.types';

const METRIC_LABELS: Record<MetricKey, string> = {
  connectorRepetition: 'Connector Repetition',
  structuralVariety: 'Structural Variety',
  vocabularyPrecision: 'Vocabulary Precision',
  verbAccuracy: 'Verb Accuracy',
  argumentClosure: 'Argument Closure',
  fillerUsage: 'Filler Usage',
  lexicalSophistication: 'Lexical Sophistication',
  registerPragmatics: 'Register & Pragmatics',
  pronunciationAccuracy: 'Pronunciation Accuracy',
  prosodyScore: 'Prosody & Rhythm',
  speakingRate: 'Speaking Rate',
};

const METRIC_KEY_SET = new Set<string>(Object.keys(METRIC_LABELS));

function isMetricKey(key: string): key is MetricKey {
  return METRIC_KEY_SET.has(key);
}

const MS_PER_DAY = 86_400_000;

type BestByKey = Map<string, number>;

function mapGroupByToBest(
  rows: Array<{ key: string; _max: { score: number | null } }>,
): BestByKey {
  const map = new Map<string, number>();
  for (const row of rows) {
    if (row._max.score !== null) {
      map.set(row.key, row._max.score);
    }
  }
  return map;
}

function qualifiesAsPr(currentScore: number, priorBest: number | undefined): boolean {
  if (priorBest === undefined) {
    return true;
  }
  return currentScore > priorBest;
}

function resolveTimeframe(
  currentScore: number,
  allTimeBest: number | undefined,
  thirtyDayBest: number | undefined,
  fourteenDayBest: number | undefined,
): { timeframe: PRTimeframe; previousBest: number | null } | null {
  if (qualifiesAsPr(currentScore, allTimeBest)) {
    return {
      timeframe: 'all-time',
      previousBest: allTimeBest ?? null,
    };
  }
  if (qualifiesAsPr(currentScore, thirtyDayBest)) {
    return {
      timeframe: '30-day',
      previousBest: thirtyDayBest ?? null,
    };
  }
  if (qualifiesAsPr(currentScore, fourteenDayBest)) {
    return {
      timeframe: '14-day',
      previousBest: fourteenDayBest ?? null,
    };
  }
  return null;
}

/**
 * Detects personal records (PRs) for a completed session across three time windows.
 *
 * For each metric in the session's `MetricSnapshot` rows, the score is compared against
 * the user's historical best in 14-day, 30-day, and all-time windows (excluding the
 * current session). At most one PR is returned per metric — the most specific timeframe
 * that qualifies (`all-time` > `30-day` > `14-day`).
 *
 * @param userId - Internal user ID (used to scope historical lookups).
 * @param sessionId - The session whose snapshots are being evaluated.
 * @param sessionDate - The session creation date, used as the reference for rolling windows.
 * @returns An array of `PersonalRecord` objects (one per qualifying metric; may be empty).
 */
export async function detectPersonalRecords(
  userId: string,
  sessionId: string,
  sessionDate: Date,
): Promise<PersonalRecord[]> {
  const currentSnapshots = await prisma.metricSnapshot.findMany({
    where: { sessionId },
  });

  if (currentSnapshots.length === 0) {
    return [];
  }

  const excludeCurrent = {
    session: { userId },
    sessionId: { not: sessionId },
  };

  const thirtyDaysAgo = new Date(sessionDate.getTime() - 30 * MS_PER_DAY);
  const fourteenDaysAgo = new Date(sessionDate.getTime() - 14 * MS_PER_DAY);

  const [allTimeBests, thirtyDayBests, fourteenDayBests] = await Promise.all([
    prisma.metricSnapshot.groupBy({
      by: ['key'],
      where: excludeCurrent,
      _max: { score: true },
    }),
    prisma.metricSnapshot.groupBy({
      by: ['key'],
      where: {
        ...excludeCurrent,
        createdAt: { gte: thirtyDaysAgo },
      },
      _max: { score: true },
    }),
    prisma.metricSnapshot.groupBy({
      by: ['key'],
      where: {
        ...excludeCurrent,
        createdAt: { gte: fourteenDaysAgo },
      },
      _max: { score: true },
    }),
  ]);

  const allTimeMap = mapGroupByToBest(allTimeBests);
  const thirtyDayMap = mapGroupByToBest(thirtyDayBests);
  const fourteenDayMap = mapGroupByToBest(fourteenDayBests);

  const sessionDateIso = sessionDate.toISOString();
  const records: PersonalRecord[] = [];

  for (const snapshot of currentSnapshots) {
    if (!isMetricKey(snapshot.key)) {
      continue;
    }

    const metricKey = snapshot.key;
    const currentScore = snapshot.score;
    const resolved = resolveTimeframe(
      currentScore,
      allTimeMap.get(metricKey),
      thirtyDayMap.get(metricKey),
      fourteenDayMap.get(metricKey),
    );

    if (resolved === null) {
      continue;
    }

    records.push({
      metricKey,
      metricLabel: METRIC_LABELS[metricKey],
      score: currentScore,
      timeframe: resolved.timeframe,
      previousBest: resolved.previousBest,
      sessionDate: sessionDateIso,
    });
  }

  return records;
}
