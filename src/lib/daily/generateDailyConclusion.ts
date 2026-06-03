// Orchestrates daily conclusion generation — on-demand only (44T-A). Future: QStash cron trigger.

import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { aggregateDayData } from './aggregateDayData';
import { computePillarDeltas } from './computePillarDeltas';
import { detectWinsAndStruggles } from './detectWinsAndStruggles';
import type { MetricWithDelta } from './detectWinsAndStruggles';
import { renderConclusionNarrative } from './renderConclusionNarrative';
import { fetchDayData, fetchYesterdayPillarScores } from './fetchDayData';
import { DailyConclusionDataSchema } from './generateDailyConclusion.types';
import type { DailyConclusionData, FocusTomorrow } from './generateDailyConclusion.types';

export interface GenerateConclusionInput {
  userId: string;
  date: string; // YYYY-MM-DD
}

export interface GenerateConclusionResult {
  id: string;
  conclusionData: DailyConclusionData;
}

function buildFocusTomorrow(
  struggles: Array<{ tag: string; count: number }>,
): FocusTomorrow[] {
  return struggles.slice(0, 2).map((s) => ({
    tag: s.tag,
    reason: s.count > 1 ? 'Recurring pattern' : 'New this session',
  }));
}

function buildActiveTargets(
  newVocabSpotted: Array<{ text: string; category: string }>,
): string[] {
  const unique = new Map<string, string>();
  for (const item of newVocabSpotted) {
    if (unique.size >= 4) break;
    unique.set(item.text.toLowerCase(), item.text);
  }
  return Array.from(unique.values());
}

function buildKeyInsights(
  wins: Array<{ tag: string; detail: string }>,
  struggles: Array<{ tag: string; detail: string }>,
): string[] {
  const insights: string[] = [];
  if (wins[0] !== undefined) insights.push(wins[0].detail);
  if (struggles[0] !== undefined) insights.push(struggles[0].detail);
  return insights.slice(0, 2);
}

function buildMetricDeltas(
  perMetricAverages: Array<{ key: string; average: number }>,
  firstSessionId: string,
): MetricWithDelta[] {
  return perMetricAverages.map((m) => ({
    key: m.key,
    todayAvg: m.average,
    yesterdayAvg: null,
    sessionId: firstSessionId,
  }));
}

interface WriteInput {
  userId: string;
  date: string;
  validated: DailyConclusionData;
  renderedFeedback: string;
  aggregated: { sessionCount: number; totalDurationSecs: number };
  overallScore: number;
  pillarScores: { delivery: number; language: number; pronunciation: number };
}

async function writeConclusionToDb(input: WriteInput): Promise<string> {
  const record = await prisma.dailyConclusion.create({
    data: {
      userId: input.userId,
      date: input.date,
      conclusionJson: JSON.parse(JSON.stringify(input.validated)),
      renderedFeedback: input.renderedFeedback,
      topicSentence: input.validated.topicSentence,
      sessionCount: input.aggregated.sessionCount,
      totalDurationSecs: input.aggregated.totalDurationSecs,
      overallScore: input.overallScore,
      deliveryAvg: input.pillarScores.delivery,
      languageAvg: input.pillarScores.language,
      pronunciationAvg: input.pillarScores.pronunciation,
    },
    select: { id: true },
  });
  return record.id;
}

export async function generateDailyConclusion(
  input: GenerateConclusionInput,
): Promise<GenerateConclusionResult | null> {
  const { userId, date } = input;

  const cached = await prisma.dailyConclusion.findUnique({
    where: { userId_date: { userId, date } },
  });
  if (cached !== null) {
    const conclusionData = DailyConclusionDataSchema.parse(cached.conclusionJson);
    return { id: cached.id, conclusionData };
  }

  const dayData = await fetchDayData({ userId, date });
  if (dayData === null) return null;

  const sessionsForAgg = dayData.sessions.map((s) => ({
    sessionId: s.id, durationSecs: s.durationSecs, intentLabel: s.intentLabel, metrics: s.metrics,
  }));
  const aggregated = aggregateDayData(sessionsForAgg);
  const yesterdayScores = await fetchYesterdayPillarScores(userId, date);
  const { pillarScores, metricDeltas, overallScore } = computePillarDeltas(
    aggregated.pillarScores, yesterdayScores,
  );

  const firstSessionId = dayData.sessions[0]?.id ?? '';
  const detected = detectWinsAndStruggles({
    metrics: buildMetricDeltas(aggregated.perMetricAverages, firstSessionId),
    naturalnessIssues: dayData.naturalnessIssues,
    pronunciationIssues: dayData.pronunciationIssues,
    vocabSuggestions: dayData.vocabItems,
  });

  const narrative = await renderConclusionNarrative({
    pillarScores, metricDeltas, wins: detected.wins, struggles: detected.struggles,
    intentLabels: aggregated.intentLabels, sessionCount: aggregated.sessionCount,
    totalDurationSecs: aggregated.totalDurationSecs,
  });

  const conclusionData: DailyConclusionData = {
    date, overallScore, totalDurationSecs: aggregated.totalDurationSecs,
    topicSentence: narrative.topicSentence, pillarScores, metricDeltas,
    wins: detected.wins, struggles: detected.struggles,
    persistentStruggles: [], improvedSinceYesterday: [],
    newVocabSpotted: detected.newVocabSpotted,
    focusTomorrow: buildFocusTomorrow(detected.struggles),
    activeTargetsTomorrow: buildActiveTargets(detected.newVocabSpotted),
    keyInsights: buildKeyInsights(detected.wins, detected.struggles),
    tone: 'supportive_neutral',
  };

  const validated = DailyConclusionDataSchema.parse(conclusionData);
  const id = await writeConclusionToDb({
    userId, date, validated, renderedFeedback: narrative.renderedFeedback,
    aggregated, overallScore, pillarScores,
  });

  logger.info({ userId, date, id }, 'generateDailyConclusion: conclusion created');
  return { id, conclusionData: validated };
}
