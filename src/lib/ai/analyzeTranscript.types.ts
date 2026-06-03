// Options types for analyzeTranscript and buildUserPrompt
import type { PronunciationSummary } from './analyze';
import type { CorpusEvidence } from '@/lib/analysis/analysis.types';

/** Options for analyzeTranscript — replaces the 4-param positional signature. */
export interface AnalyzeTranscriptOptions {
  readonly transcript: string;
  readonly focusMetricKey?: string | null | undefined;
  readonly pronunciationSummary?: PronunciationSummary | null | undefined;
  readonly promptUsed?: string | null | undefined;
  readonly corpusEvidence?: CorpusEvidence | null | undefined;
}

/** Options for buildUserPrompt — replaces the 4-param positional signature. */
export interface BuildUserPromptOptions {
  readonly transcript: string;
  readonly focusMetricKey?: string | null | undefined;
  readonly pronunciationSummary?: PronunciationSummary | null | undefined;
  readonly promptUsed?: string | null | undefined;
  readonly corpusEvidence?: CorpusEvidence | null | undefined;
}
