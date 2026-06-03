// Derives wins and struggles from a day's metrics, naturalness flags, and pronunciation issues

import type { Win, Struggle } from './generateDailyConclusion.types';

export interface MetricWithDelta {
  key: string;
  todayAvg: number;
  yesterdayAvg: number | null;
  sessionId: string;
}

export interface NaturalnessIssue {
  tag: string;
  detail: string;
  flagId: string;
  sessionId: string;
}

export interface PronunciationIssue {
  tag: string;
  detail: string;
  sessionId: string;
}

export interface VocabItem {
  text: string;
  category: string;
  sessionId: string;
}

export interface DetectInput {
  metrics: MetricWithDelta[];
  naturalnessIssues: NaturalnessIssue[];
  pronunciationIssues: PronunciationIssue[];
  vocabSuggestions: VocabItem[];
}

export interface DetectResult {
  wins: Win[];
  struggles: Struggle[];
  newVocabSpotted: Array<{ text: string; category: string }>;
}

const WIN_THRESHOLD = 0.3;
const STRUGGLE_THRESHOLD = 0.5;
const MAX_WINS = 3;
const MAX_STRUGGLES = 5;

function detectMetricWins(metrics: MetricWithDelta[]): Win[] {
  return metrics
    .filter((m) => m.yesterdayAvg !== null && m.todayAvg - m.yesterdayAvg >= WIN_THRESHOLD)
    .sort((a, b) => {
      const deltaA = a.yesterdayAvg !== null ? a.todayAvg - a.yesterdayAvg : 0;
      const deltaB = b.yesterdayAvg !== null ? b.todayAvg - b.yesterdayAvg : 0;
      return deltaB - deltaA;
    })
    .slice(0, MAX_WINS)
    .map((m) => {
      const delta = (m.todayAvg - (m.yesterdayAvg ?? 0)).toFixed(1);
      return {
        tag: m.key,
        detail: `+${delta} improvement in ${m.key}`,
        evidenceSessionId: m.sessionId,
      };
    });
}

function groupNaturalnessStruggles(issues: NaturalnessIssue[]): Struggle[] {
  const byTag = new Map<string, { detail: string; flagIds: string[] }>();

  for (const issue of issues) {
    const existing = byTag.get(issue.tag);
    if (existing) {
      existing.flagIds.push(issue.flagId);
    } else {
      byTag.set(issue.tag, { detail: issue.detail, flagIds: [issue.flagId] });
    }
  }

  return Array.from(byTag.entries()).map(([tag, { detail, flagIds }]) => ({
    tag,
    detail,
    count: flagIds.length,
    flagIds,
  }));
}

function groupPronunciationStruggles(issues: PronunciationIssue[]): Struggle[] {
  const byTag = new Map<string, { detail: string; count: number }>();

  for (const issue of issues) {
    const existing = byTag.get(issue.tag);
    if (existing) {
      existing.count += 1;
    } else {
      byTag.set(issue.tag, { detail: issue.detail, count: 1 });
    }
  }

  return Array.from(byTag.entries()).map(([tag, { detail, count }]) => ({
    tag,
    detail,
    count,
  }));
}

function detectMetricStruggles(metrics: MetricWithDelta[]): Struggle[] {
  return metrics
    .filter((m) => m.yesterdayAvg !== null && m.yesterdayAvg - m.todayAvg >= STRUGGLE_THRESHOLD)
    .map((m) => {
      const drop = (m.yesterdayAvg ?? 0) - m.todayAvg;
      return {
        tag: m.key,
        detail: `-${drop.toFixed(1)} decline in ${m.key}`,
        count: 1,
      };
    });
}

function deduplicateVocab(
  items: VocabItem[],
): Array<{ text: string; category: string }> {
  const seen = new Set<string>();
  const result: Array<{ text: string; category: string }> = [];

  for (const item of items) {
    const key = item.text.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      result.push({ text: item.text, category: item.category });
    }
  }

  return result;
}

export function detectWinsAndStruggles(input: DetectInput): DetectResult {
  const wins = detectMetricWins(input.metrics);

  const allStruggles: Struggle[] = [
    ...groupNaturalnessStruggles(input.naturalnessIssues),
    ...groupPronunciationStruggles(input.pronunciationIssues),
    ...detectMetricStruggles(input.metrics),
  ]
    .sort((a, b) => b.count - a.count)
    .slice(0, MAX_STRUGGLES);

  const newVocabSpotted = deduplicateVocab(input.vocabSuggestions);

  return { wins, struggles: allStruggles, newVocabSpotted };
}
