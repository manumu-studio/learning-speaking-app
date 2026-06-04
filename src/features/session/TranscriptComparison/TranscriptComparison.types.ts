// Type definitions for the TranscriptComparison component

import type { DivergenceSpan } from '@/lib/analysis/divergence/divergence.types';

export interface TranscriptComparisonProps {
  /** Whisper cleaned transcript text */
  whisperText: string;
  /** AssemblyAI verbatim transcript text */
  verbatimText: string;
  /** Pre-computed divergence spans between the two transcripts */
  divergenceSpans: DivergenceSpan[];
  /** Word count from the Whisper transcript */
  whisperWordCount: number | null;
  /** Word count from the verbatim transcript */
  verbatimWordCount: number | null;
  /** Name of the verbatim ASR provider */
  verbatimProvider: string | null;
}
