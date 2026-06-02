// Helpers for GET /api/users/me/daily-summaries — DB queries, pillar scoring, and metric analysis
import { prisma } from '@/lib/prisma';
import { PILLAR_CONFIG } from '@/features/dashboard/pillars';

// ---------------------------------------------------------------------------
// Constants — metric key sets per pillar
// ---------------------------------------------------------------------------

export const DELIVERY_KEYS: readonly string[] = PILLAR_CONFIG.delivery.metricKeys;
export const LANGUAGE_KEYS: readonly string[] = PILLAR_CONFIG.language.metricKeys;
export const PRONUNCIATION_KEYS: readonly string[] = PILLAR_CONFIG.pronunciation.metricKeys;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type MetricRow = { key: string; score: number };

export type MetricAverage = { key: string; score: number };

export type PillarAverages = {
  deliveryAvg: number;
  languageAvg: number;
  pronunciationAvg: number;
};

// ---------------------------------------------------------------------------
// Pure helpers
// ---------------------------------------------------------------------------

/** Compute the arithmetic mean of an array. Returns 0 for empty arrays. */
export function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

/** Round to one decimal place. */
function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

/** Compute pillar averages from a flat list of metric snapshots. */
export function computePillarAverages(snapshots: MetricRow[]): PillarAverages {
  const deliveryAvg = round1(
    mean(snapshots.filter((s) => DELIVERY_KEYS.includes(s.key)).map((s) => s.score)),
  );
  const languageAvg = round1(
    mean(snapshots.filter((s) => LANGUAGE_KEYS.includes(s.key)).map((s) => s.score)),
  );
  const pronunciationAvg = round1(
    mean(snapshots.filter((s) => PRONUNCIATION_KEYS.includes(s.key)).map((s) => s.score)),
  );
  return { deliveryAvg, languageAvg, pronunciationAvg };
}

/**
 * Compute per-metric averages from a flat snapshot list.
 * Returns them sorted descending by score (best first).
 */
export function computeMetricAverages(snapshots: MetricRow[]): MetricAverage[] {
  const grouped = snapshots.reduce<Record<string, number[]>>((acc, s) => {
    const arr = acc[s.key] ?? [];
    arr.push(s.score);
    acc[s.key] = arr;
    return acc;
  }, {});

  return Object.entries(grouped)
    .map(([key, scores]) => ({ key, score: round1(mean(scores)) }))
    .sort((a, b) => b.score - a.score);
}

// ---------------------------------------------------------------------------
// DB queries
// ---------------------------------------------------------------------------

/** Look up a user by externalId; returns null when not found. */
export async function resolveUser(externalId: string): Promise<{ id: string } | null> {
  return prisma.user.findUnique({
    where: { externalId },
    select: { id: true },
  });
}

/** Fetch DONE session IDs for a given user within a UTC day window. */
export async function fetchSessionIdsForDay(
  userId: string,
  dayStart: Date,
  dayEnd: Date,
): Promise<string[]> {
  const rows = await prisma.speakingSession.findMany({
    where: {
      userId,
      status: 'DONE',
      createdAt: { gte: dayStart, lt: dayEnd },
    },
    select: { id: true },
  });
  return rows.map((r) => r.id);
}

/** Fetch all metric snapshots for a set of session IDs. */
export async function fetchSnapshotsForSessions(sessionIds: string[]): Promise<MetricRow[]> {
  return prisma.metricSnapshot.findMany({
    where: { sessionId: { in: sessionIds } },
    select: { key: true, score: true },
  });
}

/** Fetch up to 3 new vocab words for a user within a UTC day window. */
export async function fetchNewVocabWords(
  userId: string,
  dayStart: Date,
  dayEnd: Date,
): Promise<string[]> {
  const rows = await prisma.vocabSuggestion.findMany({
    where: {
      userId,
      createdAt: { gte: dayStart, lt: dayEnd },
    },
    select: { word: true },
    take: 3,
    orderBy: { createdAt: 'desc' },
  });
  return rows.map((r) => r.word);
}
