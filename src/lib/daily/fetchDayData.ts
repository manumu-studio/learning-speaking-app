// Fetches all session data for a given day from the database

import { prisma } from '@/lib/prisma';
import type { NaturalnessIssue, PronunciationIssue, VocabItem } from './detectWinsAndStruggles';
import type { PillarScores } from './computePillarDeltas';

export interface FetchDayDataInput {
  userId: string;
  date: string; // YYYY-MM-DD
}

export interface DayData {
  sessions: Array<{
    id: string;
    durationSecs: number | null;
    intentLabel: string | null;
    metrics: Array<{ key: string; score: number }>;
  }>;
  naturalnessIssues: NaturalnessIssue[];
  pronunciationIssues: PronunciationIssue[];
  vocabItems: VocabItem[];
}

function mapNaturalnessIssues(
  flags: Array<{ id: string; sessionId: string; flagType: string; originalPhrase: string; suggestedPhrase: string }>,
): NaturalnessIssue[] {
  return flags.map((flag) => ({
    tag: `${flag.flagType}:${flag.originalPhrase}`,
    detail: `"${flag.originalPhrase}" → "${flag.suggestedPhrase}"`,
    flagId: flag.id,
    sessionId: flag.sessionId,
  }));
}

function mapPronunciationIssues(
  reports: Array<{ sessionId: string; pronScore: number }>,
): PronunciationIssue[] {
  return reports
    .filter((r) => r.pronScore < 60)
    .map((r) => ({
      tag: 'low_pronunciation',
      detail: `Pronunciation score ${r.pronScore}`,
      sessionId: r.sessionId,
    }));
}

function mapVocabItems(
  vocab: Array<{ word: string; type: string; suggestedInSessionId: string }>,
): VocabItem[] {
  return vocab.map((v) => ({
    text: v.word,
    category: v.type,
    sessionId: v.suggestedInSessionId,
  }));
}

function groupMetricsBySession(
  snapshots: Array<{ sessionId: string; key: string; score: number }>,
): Map<string, Array<{ key: string; score: number }>> {
  const grouped = new Map<string, Array<{ key: string; score: number }>>();
  for (const snap of snapshots) {
    const existing = grouped.get(snap.sessionId);
    if (existing !== undefined) {
      existing.push({ key: snap.key, score: snap.score });
    } else {
      grouped.set(snap.sessionId, [{ key: snap.key, score: snap.score }]);
    }
  }
  return grouped;
}

export async function fetchDayData(input: FetchDayDataInput): Promise<DayData | null> {
  const { userId, date } = input;
  const dayStart = new Date(`${date}T00:00:00Z`);
  const dayEnd = new Date(`${date}T23:59:59.999Z`);

  const sessions = await prisma.speakingSession.findMany({
    where: { userId, status: 'DONE', createdAt: { gte: dayStart, lte: dayEnd } },
    select: { id: true, durationSecs: true, intentLabel: true },
    orderBy: { createdAt: 'asc' },
  });

  if (sessions.length === 0) return null;

  const sessionIds = sessions.map((s) => s.id);

  const [metricSnapshots, naturalnessFlags, pronunciationReports, vocabSuggestions] =
    await Promise.all([
      prisma.metricSnapshot.findMany({
        where: { sessionId: { in: sessionIds } },
        select: { sessionId: true, key: true, score: true },
      }),
      prisma.naturalnessFlag.findMany({
        where: { sessionId: { in: sessionIds } },
        select: { id: true, sessionId: true, flagType: true, originalPhrase: true, suggestedPhrase: true },
      }),
      prisma.pronunciationReport.findMany({
        where: { sessionId: { in: sessionIds } },
        select: { sessionId: true, pronScore: true },
      }),
      prisma.vocabSuggestion.findMany({
        where: { suggestedInSessionId: { in: sessionIds } },
        select: { word: true, type: true, suggestedInSessionId: true },
      }),
    ]);

  const metricsBySession = groupMetricsBySession(metricSnapshots);

  const sessionsWithMetrics = sessions.map((s) => ({
    id: s.id,
    durationSecs: s.durationSecs,
    intentLabel: s.intentLabel,
    metrics: metricsBySession.get(s.id) ?? [],
  }));

  return {
    sessions: sessionsWithMetrics,
    naturalnessIssues: mapNaturalnessIssues(naturalnessFlags),
    pronunciationIssues: mapPronunciationIssues(pronunciationReports),
    vocabItems: mapVocabItems(vocabSuggestions),
  };
}

export async function fetchYesterdayPillarScores(
  userId: string,
  date: string,
): Promise<PillarScores | null> {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  const yesterdayDate = d.toISOString().slice(0, 10);

  const row = await prisma.dailyConclusion.findUnique({
    where: { userId_date: { userId, date: yesterdayDate } },
    select: { deliveryAvg: true, languageAvg: true, pronunciationAvg: true },
  });

  if (row === null) return null;

  return {
    delivery: row.deliveryAvg,
    language: row.languageAvg,
    pronunciation: row.pronunciationAvg,
  };
}
