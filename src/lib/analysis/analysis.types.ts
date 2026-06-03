// Types for corpus-grounded analysis pipeline
import type { LexemeLookup, CollocationLookup, MweLookup } from '@/lib/corpus';

/** Aggregated corpus evidence for one transcript — fed into the Claude prompt and hybrid scorer. */
export type CorpusEvidence = {
  readonly vocabulary: ReadonlyMap<string, LexemeLookup>;
  readonly collocations: readonly CollocationMatch[];
  readonly expressions: readonly MweMatch[];
  readonly stats: CorpusStats;
};

/** A collocation pair extracted from the transcript, with optional corpus match. */
export type CollocationMatch = {
  readonly head: string;
  readonly collocate: string;
  readonly lookup: CollocationLookup | null;
};

/** An MWE candidate extracted from the transcript, with optional corpus match. */
export type MweMatch = {
  readonly phrase: string;
  readonly lookup: MweLookup | null;
};

/** Summary statistics for the corpus evidence section. */
export type CorpusStats = {
  readonly totalContentWords: number;
  readonly matchedWords: number;
  readonly cefrDistribution: Record<string, number>;
  readonly avgFreqPerMillion: number | null;
};

/** Hybrid scoring verdict for a single expression. */
export type HybridVerdict =
  | 'PASS'
  | 'PASS_CORPUS_OVERRIDE'
  | 'FLAG'
  | 'PASS_WITH_NOTE'
  | 'SOFT_FLAG'
  | 'DEFER_TO_LLM';

/** Confidence level assigned by the hybrid scorer. */
export type HybridConfidence = 'high' | 'medium' | 'low';

/** Result of hybrid scoring for one candidate expression. */
export type HybridScoringResult = {
  readonly verdict: HybridVerdict;
  readonly confidence: HybridConfidence;
  readonly corpusSignal: 'strong' | 'mid' | 'weak' | 'absent';
  readonly reason: string;
};
