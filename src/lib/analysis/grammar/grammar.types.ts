// Type definitions for grammar flag classification — divergence spans classified by Claude

export type GrammarClassification =
  | 'grammar_error'
  | 'self_correction'
  | 'pronunciation_artifact'
  | 'false_start';

export type GrammarErrorType =
  | 'verb_tense'
  | 'article'
  | 'preposition'
  | 'agreement'
  | 'word_order'
  | 'other';

export interface GrammarFlag {
  readonly spanIndex: number;
  readonly verbatimText: string;
  readonly normalizedText: string;
  readonly classification: GrammarClassification;
  readonly errorType: GrammarErrorType | null;
  readonly confidence: number;
  readonly explanation: string;
  readonly suggestion: string;
  readonly corpusEvidence: string | null;
}
