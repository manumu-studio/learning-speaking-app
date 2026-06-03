// Collapses transcript alignment into confidence-annotated divergence spans.
import { alignTranscripts } from './align';
import type { AlignmentOp, DivergenceSpan } from './divergence.types';
import type { VerbatimWord } from '@/lib/assemblyai/transcribe';

/** Classifies a run of non-match ops by which edit types it contains. */
function spanType(ops: AlignmentOp[]): DivergenceSpan['type'] {
  const hasInsertion = ops.some((o) => o.type === 'insertion');
  const hasDeletion = ops.some((o) => o.type === 'deletion');
  const hasSubstitution = ops.some((o) => o.type === 'substitution');
  if (hasSubstitution || (hasInsertion && hasDeletion)) return 'substitution';
  if (hasInsertion) return 'insertion';
  return 'deletion';
}

/** Builds a single DivergenceSpan from a contiguous run of non-match ops. */
function buildSpan(ops: AlignmentOp[], verbatimWords: VerbatimWord[], fallbackStart: number): DivergenceSpan {
  const verbatimIdx = ops.map((o) => o.verbatimIndex).filter((n): n is number => n !== null);
  const verbatimTokens = ops.map((o) => o.verbatimToken).filter((t): t is string => t !== null);
  const normalizedTokens = ops.map((o) => o.normalizedToken).filter((t): t is string => t !== null);

  const firstIdx = verbatimIdx[0];
  const lastIdx = verbatimIdx[verbatimIdx.length - 1];
  const start = firstIdx ?? fallbackStart;
  const end = lastIdx !== undefined ? lastIdx + 1 : fallbackStart;

  const confidences = verbatimIdx
    .map((idx) => verbatimWords[idx]?.confidence)
    .filter((c): c is number => typeof c === 'number');
  const confidence = confidences.length > 0 ? confidences.reduce((a, b) => a + b, 0) / confidences.length : 1;

  return {
    start,
    end,
    verbatimText: verbatimTokens.join(' '),
    normalizedText: normalizedTokens.join(' '),
    type: spanType(ops),
    confidence,
  };
}

/**
 * Detects divergence spans between a normalized and a verbatim transcript.
 *
 * @param normalizedText - the Whisper (display) transcript
 * @param verbatimWords - AssemblyAI word objects (carry confidence)
 * @returns spans where the two transcripts disagree, ordered by verbatim position
 */
export function detectDivergence(normalizedText: string, verbatimWords: VerbatimWord[]): DivergenceSpan[] {
  const normalizedTokens = normalizedText.split(/\s+/).filter((t) => t.length > 0);
  const verbatimTokens = verbatimWords.map((w) => w.text);
  const ops = alignTranscripts(normalizedTokens, verbatimTokens);

  const spans: DivergenceSpan[] = [];
  let run: AlignmentOp[] = [];
  let lastVerbatimIndex = 0;

  for (const op of ops) {
    if (op.type === 'match') {
      if (run.length > 0) spans.push(buildSpan(run, verbatimWords, lastVerbatimIndex));
      run = [];
      if (op.verbatimIndex !== null) lastVerbatimIndex = op.verbatimIndex + 1;
    } else {
      run.push(op);
    }
  }
  if (run.length > 0) spans.push(buildSpan(run, verbatimWords, lastVerbatimIndex));
  return spans;
}
