// Aggregates per-word prosody signals — filters noise, ranks by severity, limits to actionable issues
import { useMemo } from 'react';
import type { WordPronunciation } from '@/components/ui/PronunciationSection';
import type { ProsodyIssue, ProsodyCoachingSummary } from './ProsodyFeedback.types';

const MONOTONE_THRESHOLD = 0.3;
const MAX_HIGHLIGHTED_WORDS = 5;

type IssueType = 'break' | 'intonation' | 'monotone';

const COACHING_MAP: Record<string, { type: IssueType; tip: string }> = {
  UnexpectedBreak: { type: 'break', tip: 'Remove the pause here — let the phrase flow together' },
  MissingBreak: { type: 'break', tip: 'Add a brief pause here to separate your ideas' },
  MonotonePitch: { type: 'intonation', tip: 'Vary your pitch — stress the key word in this phrase' },
  FlatPitch: { type: 'intonation', tip: 'Let your voice rise or fall naturally here' },
  Monotone: { type: 'intonation', tip: 'This sounds flat — exaggerate the stressed syllable slightly' },
  MonotoneRate: { type: 'monotone', tip: 'Vary your speaking speed — slow down on important words' },
};

function filterNone(types: string[]): string[] {
  return types.filter(t => t !== 'None');
}

function getIssueSeverity(word: WordPronunciation): number {
  const breakErrors = filterNone(word.breakErrorTypes);
  const intonationErrors = filterNone(word.intonationErrorTypes);
  const isMonotone = word.monotonePitchDelta !== null && word.monotonePitchDelta < MONOTONE_THRESHOLD;

  let severity = 0;
  severity += breakErrors.length * 2;
  severity += intonationErrors.length * 2;
  if (isMonotone) severity += 1;
  return severity;
}

function buildIssuesForWord(word: WordPronunciation, index: number): ProsodyIssue | null {
  const breakErrors = filterNone(word.breakErrorTypes);
  const intonationErrors = filterNone(word.intonationErrorTypes);
  const isMonotone = word.monotonePitchDelta !== null && word.monotonePitchDelta < MONOTONE_THRESHOLD;

  if (breakErrors.length === 0 && intonationErrors.length === 0 && !isMonotone) {
    return null;
  }

  const tips: string[] = [];
  let primaryType: IssueType = 'monotone';

  for (const err of breakErrors) {
    const coaching = COACHING_MAP[err];
    if (coaching) {
      tips.push(coaching.tip);
      primaryType = 'break';
    }
  }

  for (const err of intonationErrors) {
    const coaching = COACHING_MAP[err];
    if (coaching) {
      tips.push(coaching.tip);
      primaryType = 'intonation';
    }
  }

  if (isMonotone && tips.length === 0) {
    tips.push('Vary your pitch — this word sounds flat');
  }

  return {
    word: word.word,
    index,
    type: primaryType,
    tip: tips[0] ?? 'Try varying your rhythm here',
    severity: getIssueSeverity(word),
  };
}

export function useProsodyFeedback(words: WordPronunciation[]): ProsodyCoachingSummary {
  return useMemo(() => {
    const allIssues: ProsodyIssue[] = [];

    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      if (!word) continue;
      const issue = buildIssuesForWord(word, i);
      if (issue) {
        allIssues.push(issue);
      }
    }

    // Rank by severity, keep top N
    const topIssues = allIssues
      .sort((a, b) => b.severity - a.severity)
      .slice(0, MAX_HIGHLIGHTED_WORDS);

    // Build summary coaching line
    const breakCount = allIssues.filter(i => i.type === 'break').length;
    const intonationCount = allIssues.filter(i => i.type === 'intonation').length;
    const monotoneCount = allIssues.filter(i => i.type === 'monotone').length;

    let coachingSummary: string | null = null;
    if (allIssues.length === 0) {
      coachingSummary = null;
    } else if (breakCount >= intonationCount && breakCount >= monotoneCount) {
      coachingSummary = 'Focus on your pauses — some are misplaced or missing between clauses.';
    } else if (intonationCount >= monotoneCount) {
      coachingSummary = 'Focus on pitch variety — key words need more rise and fall to sound natural.';
    } else {
      coachingSummary = 'Focus on rhythm — vary your speed and stress to avoid sounding flat.';
    }

    return {
      topIssues,
      totalIssueCount: allIssues.length,
      coachingSummary,
      hasIssues: allIssues.length > 0,
    };
  }, [words]);
}
