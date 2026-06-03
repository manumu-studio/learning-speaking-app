// Hybrid scoring decision rule — confirms/overrides LLM judgments using corpus signal strength
import type { HybridScoringResult } from './analysis.types';

/** Claude's judgment about a single expression. */
export type LlmJudgment = {
  readonly natural: boolean;
  readonly confidence: number;
};

/** Corpus signal for a single expression — from collocation or MWE lookup. */
export type CorpusSignal = {
  readonly attested: boolean;
  readonly logDice: number | null;
  readonly mi: number | null;
  readonly freq: number | null;
};

type CorpusStrength = 'strong' | 'mid' | 'weak' | 'absent';

/**
 * Classifies a corpus signal as strong, mid, weak, or absent.
 *
 * @param corpus - Corpus attestation data for one expression.
 * @returns The strength classification.
 */
export function classifyCorpusStrength(corpus: CorpusSignal): CorpusStrength {
  if (!corpus.attested && corpus.freq === null && corpus.logDice === null && corpus.mi === null) {
    return 'absent';
  }

  if (corpus.attested) {
    const strongLogDice = corpus.logDice !== null && corpus.logDice >= 7;
    const strongMi = corpus.mi !== null && corpus.mi >= 5;
    if (strongLogDice || strongMi) return 'strong';
  }

  const weakLogDice = corpus.logDice !== null && corpus.logDice < 3;
  const weakFreq = corpus.freq !== null && corpus.freq < 5;
  if (!corpus.attested || weakLogDice || weakFreq) return 'weak';

  return 'mid';
}

function formatMetric(corpus: CorpusSignal): string {
  if (corpus.logDice !== null) return `logDice: ${corpus.logDice.toFixed(1)}`;
  if (corpus.mi !== null) return `MI: ${corpus.mi.toFixed(1)}`;
  if (corpus.freq !== null) return `freq: ${corpus.freq}`;
  return 'no metric data';
}

function scoreStrongCorpus(llm: LlmJudgment, metric: string): HybridScoringResult {
  if (llm.natural) {
    return { verdict: 'PASS', confidence: 'high', corpusSignal: 'strong', reason: `Corpus-confirmed natural expression (${metric})` };
  }
  return { verdict: 'PASS_CORPUS_OVERRIDE', confidence: 'high', corpusSignal: 'strong', reason: `Corpus overrides LLM — strongly attested (${metric})` };
}

function scoreWeakCorpus(
  llm: LlmJudgment,
  strength: 'weak' | 'absent',
  metric: string,
): HybridScoringResult {
  if (!llm.natural) {
    return { verdict: 'FLAG', confidence: 'high', corpusSignal: strength, reason: `Unattested and LLM-flagged — likely unnatural (${metric})` };
  }
  if (llm.confidence >= 0.85) {
    return { verdict: 'PASS_WITH_NOTE', confidence: 'low', corpusSignal: strength, reason: `LLM confident but unattested — monitor (${metric})` };
  }
  return { verdict: 'SOFT_FLAG', confidence: 'medium', corpusSignal: strength, reason: `Weak corpus signal and uncertain LLM — soft flag (${metric})` };
}

/**
 * Applies the hybrid scoring decision rule to one candidate expression.
 *
 * Six-row decision table combining corpus attestation strength with
 * Claude's naturalness judgment to produce a final verdict.
 *
 * @param corpus - Corpus attestation signal.
 * @param llm - Claude's naturalness judgment.
 * @returns Verdict with confidence and reason.
 */
export function scoreExpression(
  corpus: CorpusSignal,
  llm: LlmJudgment,
): HybridScoringResult {
  const strength = classifyCorpusStrength(corpus);
  const metric = formatMetric(corpus);

  if (strength === 'strong') return scoreStrongCorpus(llm, metric);
  if (strength === 'weak' || strength === 'absent') return scoreWeakCorpus(llm, strength, metric);

  return { verdict: 'DEFER_TO_LLM', confidence: 'low', corpusSignal: 'mid', reason: `Mid-range corpus signal — deferring to LLM (${metric})` };
}

/**
 * Checks if a word qualifies for a CEFR boost (C1/C2 AND attested).
 *
 * @param cefr - CEFR level string from corpus lookup.
 * @param attested - Whether the word is attested in corpus.
 * @returns True if this word deserves a sophistication boost.
 */
export function qualifiesForCefrBoost(cefr: string | null, attested: boolean): boolean {
  if (!attested || cefr === null) return false;
  const upper = cefr.toUpperCase();
  return upper === 'C1' || upper === 'C2';
}

/**
 * Detects "B1 filler" pattern — high-freq low-level word where a C2 alternative exists.
 *
 * @param cefr - Word's CEFR level.
 * @param freqPerMillion - Frequency per million words.
 * @returns True if this word is a B1 filler candidate.
 */
export function isB1Filler(cefr: string | null, freqPerMillion: number | null): boolean {
  if (cefr === null || freqPerMillion === null) return false;
  const upper = cefr.toUpperCase();
  const isLowLevel = upper === 'A1' || upper === 'A2' || upper === 'B1';
  return isLowLevel && freqPerMillion > 500;
}
