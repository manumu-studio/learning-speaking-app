// Evidence type contracts — traces user-facing claims to real DB rows

export type EvidenceSource =
  | 'metric_snapshot'
  | 'insight'
  | 'pronunciation_report'
  | 'word_pronunciation'
  | 'naturalness_flag'
  | 'grammar_flag'
  | 'divergence_span'
  | 'corpus_frequency'
  | 'corpus_collocation'
  | 'language_bank_item'
  | 'daily_conclusion'
  | 'pipeline_metadata';

export interface EvidenceRef {
  source: EvidenceSource;
  table: string;
  rowId: string;
  field: string | null;
}

export interface EvidenceItem {
  ref: EvidenceRef;
  label: string;
  rawValue: unknown;
  displayValue: string;
  timestamp: string;
  sessionId: string | null;
}

export interface TranscriptSpanRef {
  sessionId: string;
  startWordIndex: number;
  endWordIndex: number;
  verbatimText: string;
  normalizedText: string;
  confidence: number | null;
}

export interface MetricEvidence extends EvidenceItem {
  metricKey: string;
  normalizedScore: number;
  previousScore: number | null;
  delta: number | null;
}

export interface CorpusEvidenceRef {
  lexemeId: string;
  word: string;
  frequency: number;
  mi: number | null;
  register: string | null;
  attestedInCorpus: boolean;
}

export interface GrammarEvidence extends EvidenceItem {
  spanRef: TranscriptSpanRef;
  classification:
    | 'grammar_error'
    | 'self_correction'
    | 'pronunciation_artifact'
    | 'false_start';
  errorType: string | null;
  corpusEvidence: string | null;
}

export interface PronunciationEvidence extends EvidenceItem {
  word: string;
  accuracyScore: number;
  expectedIpa: string | null;
  actualIpa: string | null;
  errorType: string;
}

export interface NaturalnessEvidence extends EvidenceItem {
  flagType: string;
  collocationMetric: number | null;
  suggestion: string | null;
}

export interface PipelineMetadata {
  asrProvider: string;
  verbatimProvider: string | null;
  modelVersion: string | null;
  processingTimestamp: string;
  chunkCount: number;
}

export interface EvidenceBundle {
  entityType: 'session' | 'day';
  entityId: string;
  metrics: MetricEvidence[];
  transcript: TranscriptSpanRef[];
  grammar: GrammarEvidence[];
  pronunciation: PronunciationEvidence[];
  naturalness: NaturalnessEvidence[];
  corpus: CorpusEvidenceRef[];
  pipelineMetadata: PipelineMetadata | null;
}
