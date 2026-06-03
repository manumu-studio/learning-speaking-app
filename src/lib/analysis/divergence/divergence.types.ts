// Shared types for dual-transcript divergence detection.

/** A single aligned edit step between normalized and verbatim token streams. */
export type AlignmentOp = {
  type: 'match' | 'insertion' | 'deletion' | 'substitution';
  verbatimIndex: number | null; // index into verbatim tokens, null for deletions
  normalizedIndex: number | null; // index into normalized tokens, null for insertions
  verbatimToken: string | null;
  normalizedToken: string | null;
};

/** A contiguous run of non-match ops = a candidate grammar/disfluency span. */
export type DivergenceSpan = {
  start: number; // word index in verbatim
  end: number; // word index in verbatim (exclusive)
  verbatimText: string; // what was actually said
  normalizedText: string; // what Whisper corrected it to
  type: 'insertion' | 'deletion' | 'substitution';
  confidence: number; // mean AssemblyAI word confidence over the span (0–1)
};
