// Orchestrates the day-detail meta-session read model from raw session evidence
import { aggregateDayData } from '@/lib/daily/aggregateDayData';
import { DailyConclusionDataSchema } from '@/lib/daily/generateDailyConclusion.types';
import { prisma } from '@/lib/prisma';
import { buildDayEvidenceBundle } from './buildDayEvidenceBundle';
import { buildDayGeneralFeedback } from './buildDayGeneralFeedback';
import { buildDayPronunciation } from './buildDayPronunciation';
import { buildDaySessions } from './buildDaySessions';
import { buildDaySpeechQuality } from './buildDaySpeechQuality';
import { buildDayTranscript } from './buildDayTranscript';
import type { DayDetailData, DayHeroData, SourceAvailability } from './buildDayDetailData.types';

export interface BuildDayDetailDataInput {
  readonly userId: string;
  readonly date: string;
}

type DayConclusionRow = {
  renderedFeedback: string;
  topicSentence: string;
  overallScore: number;
  deliveryAvg: number;
  languageAvg: number;
  pronunciationAvg: number;
  conclusionJson: unknown;
} | null;

function dayWindow(date: string): { start: Date; end: Date } {
  const start = new Date(`${date}T00:00:00.000Z`);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);
  return { start, end };
}

function roundOne(value: number): number {
  return Math.round(value * 10) / 10;
}

function average(values: readonly number[]): number | null {
  if (values.length === 0) return null;
  return roundOne(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function buildSourceAvailability(input: {
  sessions: Awaited<ReturnType<typeof fetchSessions>>;
  naturalnessCount: number;
  wordBankCount: number;
}): SourceAvailability {
  return {
    pronunciation: input.sessions.some((session) => session.pronunciationReport !== null),
    naturalness: input.naturalnessCount > 0,
    corpus: input.sessions.some((session) =>
      session.naturalness.some((flag) => flag.collocationMetric !== null),
    ),
    verbatim: input.sessions.some((session) => session.verbatimTranscript !== null),
    grammar: input.sessions.some((session) => session.grammarFlags !== null),
    languageBank: input.wordBankCount > 0,
  };
}

function focusAreasFromMetrics(
  sessions: Awaited<ReturnType<typeof fetchSessions>>,
): string[] {
  const metricRows = sessions.flatMap((session) => session.metrics);
  const byKey = new Map<string, number[]>();
  for (const metric of metricRows) {
    const rows = byKey.get(metric.key) ?? [];
    rows.push(metric.score);
    byKey.set(metric.key, rows);
  }
  return [...byKey.entries()]
    .map(([key, scores]) => ({ key, score: average(scores) ?? 0 }))
    .sort((a, b) => a.score - b.score)
    .slice(0, 3)
    .map((metric) => metric.key);
}

function totalWords(sessions: Awaited<ReturnType<typeof fetchSessions>>): number {
  return sessions.reduce(
    (sum, session) => sum + (session.transcript?.wordCount ?? session.verbatimWordCount ?? 0),
    0,
  );
}

function buildHero(input: {
  date: string;
  sessions: Awaited<ReturnType<typeof fetchSessions>>;
  conclusion: DayConclusionRow;
}): DayHeroData {
  const aggregateInput = input.sessions.map((session) => ({
    sessionId: session.id,
    durationSecs: session.durationSecs,
    intentLabel: session.intentLabel,
    metrics: session.metrics.map((metric) => ({ key: metric.key, score: metric.score })),
  }));
  const aggregated = aggregateDayData(aggregateInput);
  const fallbackOverall = average(Object.values(aggregated.pillarScores));
  const parsed = DailyConclusionDataSchema.safeParse(input.conclusion?.conclusionJson);
  const topicSentence = input.conclusion?.topicSentence
    ?? (parsed.success ? parsed.data.topicSentence : 'We practiced speaking today.');
  return {
    date: input.date,
    overallScore: input.conclusion?.overallScore ?? fallbackOverall,
    sessionCount: input.sessions.length,
    totalDurationSecs: aggregated.totalDurationSecs,
    totalWords: totalWords(input.sessions),
    focusAreas: focusAreasFromMetrics(input.sessions),
    topicSentence,
    pillarScores: {
      delivery: input.conclusion?.deliveryAvg ?? aggregated.pillarScores.delivery,
      language: input.conclusion?.languageAvg ?? aggregated.pillarScores.language,
      pronunciation: input.conclusion?.pronunciationAvg ?? aggregated.pillarScores.pronunciation,
    },
  };
}

async function fetchSessions(input: BuildDayDetailDataInput) {
  const { start, end } = dayWindow(input.date);
  return prisma.speakingSession.findMany({
    where: {
      userId: input.userId,
      status: 'DONE',
      createdAt: { gte: start, lt: end },
    },
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      status: true,
      createdAt: true,
      durationSecs: true,
      intentLabel: true,
      topic: true,
      promptUsed: true,
      registerFeedback: true,
      grammarFlags: true,
      verbatimTranscript: true,
      verbatimWordCount: true,
      transcript: { select: { text: true, improvedText: true, wordCount: true } },
      insights: {
        select: { category: true, pattern: true, detail: true, suggestion: true },
      },
      metrics: {
        select: { key: true, score: true, note: true },
      },
      naturalness: {
        where: { userId: input.userId, shownToUser: true },
        select: {
          originalPhrase: true,
          suggestedPhrase: true,
          flagType: true,
          confidence: true,
          collocationMetric: true,
          metricValue: true,
          rationale: true,
        },
      },
      pronunciationReport: {
        select: {
          pronScore: true,
          accuracyScore: true,
          fluencyScore: true,
          completenessScore: true,
          prosodyScore: true,
          speakingRateWpm: true,
          words: {
            orderBy: { wordIndex: 'asc' },
            select: {
              display: true,
              word: true,
              wordIndex: true,
              accuracyScore: true,
              errorType: true,
              offsetMs: true,
              durationMs: true,
              phonemes: true,
              l1Tags: true,
              breakErrorTypes: true,
              intonationErrorTypes: true,
              monotonePitchDelta: true,
            },
          },
        },
      },
    },
  });
}

async function fetchConclusion(input: BuildDayDetailDataInput): Promise<DayConclusionRow> {
  return prisma.dailyConclusion.findUnique({
    where: { userId_date: { userId: input.userId, date: input.date } },
    select: {
      renderedFeedback: true,
      topicSentence: true,
      overallScore: true,
      deliveryAvg: true,
      languageAvg: true,
      pronunciationAvg: true,
      conclusionJson: true,
    },
  });
}

async function fetchWordBank(userId: string) {
  return prisma.languageBankItem.findMany({
    where: { userId },
    orderBy: [{ isActiveTarget: 'desc' }, { usageCount: 'asc' }, { text: 'asc' }],
    select: {
      text: true,
      category: true,
      source: true,
      usageCount: true,
      masteryState: true,
      isActiveTarget: true,
    },
  });
}

/** Builds a completed-day meta-session from raw user-scoped session evidence. */
export async function buildDayDetailData(
  input: BuildDayDetailDataInput,
): Promise<DayDetailData | null> {
  const sessions = await fetchSessions(input);
  if (sessions.length === 0) return null;

  const [conclusion, wordBankItems] = await Promise.all([
    fetchConclusion(input),
    fetchWordBank(input.userId),
  ]);
  const sourceAvailability = buildSourceAvailability({
    sessions,
    naturalnessCount: sessions.reduce((sum, session) => sum + session.naturalness.length, 0),
    wordBankCount: wordBankItems.length,
  });

  return {
    hero: buildHero({ date: input.date, sessions, conclusion }),
    sessions: buildDaySessions({ sessions }),
    speechQuality: buildDaySpeechQuality({
      sessions,
      naturalnessFlags: sessions.flatMap((session) => session.naturalness),
      wordBankItems,
      sourceAvailability,
    }),
    pronunciation: buildDayPronunciation({
      reports: sessions.flatMap((session) =>
        session.pronunciationReport === null ? [] : [session.pronunciationReport],
      ),
      sourceAvailability,
    }),
    generalFeedback: buildDayGeneralFeedback(
      buildDayEvidenceBundle(sessions, wordBankItems, input.date),
    ),
    transcript: buildDayTranscript({
      sessions: sessions.map((session) => ({
        id: session.id,
        createdAt: session.createdAt,
        intentLabel: session.intentLabel,
        topic: session.topic,
        promptUsed: session.promptUsed,
        transcript: session.transcript,
        pronunciationWords: session.pronunciationReport?.words ?? [],
      })),
    }),
  };
}
