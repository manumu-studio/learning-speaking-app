// Evidence-based verbAccuracy scoring from classified grammar flags
import type { GrammarFlag, GrammarErrorType } from './grammar.types';

export interface VerbAccuracyResult {
  readonly score: number;
  readonly level: 'low' | 'medium' | 'high';
  readonly note: string;
  readonly errorCount: number;
  readonly totalSpans: number;
}

const SEVERITY_WEIGHTS: Record<GrammarErrorType, number> = {
  verb_tense: 1.5,
  agreement: 1.3,
  word_order: 1.2,
  preposition: 1.0,
  other: 1.0,
  article: 0.8,
};

const CORPUS_BOOST = 1.3;

function deriveLevel(score: number): 'low' | 'medium' | 'high' {
  if (score <= 3) return 'low';
  if (score <= 6) return 'medium';
  return 'high';
}

function mostCommonErrorType(errors: readonly GrammarFlag[]): string {
  const counts = new Map<string, number>();
  for (const flag of errors) {
    if (flag.errorType) {
      counts.set(flag.errorType, (counts.get(flag.errorType) ?? 0) + 1);
    }
  }
  let maxType = 'other';
  let maxCount = 0;
  for (const [type, count] of counts) {
    if (count > maxCount) {
      maxCount = count;
      maxType = type;
    }
  }
  return maxType.replace('_', ' ');
}

export function scoreVerbAccuracy(
  flags: readonly GrammarFlag[],
  totalDivergenceSpans: number,
): VerbAccuracyResult {
  if (totalDivergenceSpans === 0) {
    return { score: 10, level: 'high', note: 'No divergence spans to evaluate.', errorCount: 0, totalSpans: 0 };
  }

  const errors = flags.filter((f) => f.classification === 'grammar_error');

  if (errors.length === 0) {
    return {
      score: 10,
      level: 'high',
      note: 'No grammar errors detected in divergence spans.',
      errorCount: 0,
      totalSpans: totalDivergenceSpans,
    };
  }

  let weightedErrorScore = 0;
  for (const error of errors) {
    const severityWeight = error.errorType ? SEVERITY_WEIGHTS[error.errorType] : 1.0;
    const corpusMultiplier = error.corpusEvidence !== null ? CORPUS_BOOST : 1.0;
    weightedErrorScore += severityWeight * error.confidence * corpusMultiplier;
  }

  const rawScore = (1 - weightedErrorScore / Math.max(totalDivergenceSpans, 1)) * 10;
  const score = Math.round(Math.min(10, Math.max(1, rawScore)));
  const level = deriveLevel(score);
  const topError = mostCommonErrorType(errors);
  const note = `${errors.length} grammar error(s) found in ${totalDivergenceSpans} divergence span(s). Most common: ${topError}.`;

  return { score, level, note, errorCount: errors.length, totalSpans: totalDivergenceSpans };
}
