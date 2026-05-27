// Type definitions for useSessionStatus hook

/** Normalised metric row attached to a session detail payload (mirrors `MetricSnapshot` in the API). */
export interface SessionMetricSnapshot {
  id: string;
  key: string;
  level: string;
  score: number;
  note: string | null;
  createdAt: string;
}

export type WordPronunciationDetail = {
  word: string;
  accuracyScore: number;
  errorType: string;
  offsetMs: number;
  durationMs: number;
  phonemes: unknown;
  l1Tags: string[];
  breakErrorTypes: string[];
  intonationErrorTypes: string[];
  monotonePitchDelta: number | null;
};

export type PronunciationReportDetail = {
  pronScore: number;
  accuracyScore: number;
  fluencyScore: number;
  completenessScore: number;
  prosodyScore: number;
  speakingRateWpm: number;
  failureReason: string | null;
  words: WordPronunciationDetail[];
};

/**
 * Full session the client polls while processing — transcript and insights load when the server includes them.
 * Status values align with Prisma `SessionStatus`.
 */
export interface SessionDetail {
  id: string;
  status: 'CREATED' | 'UPLOADED' | 'TRANSCRIBING' | 'SCORING' | 'ANALYZING' | 'DONE' | 'FAILED';
  durationSecs: number | null;
  topic: string | null;
  focusNext: string | null;
  summary: string | null;
  errorMessage: string | null;
  focusMetricKey: string | null;
  createdAt: string;
  transcript?: {
    text: string;
    wordCount: number | null;
  };
  insights: Array<{
    id: string;
    category: string;
    pattern: string;
    detail: string;
    frequency: number | null;
    severity: string | null;
    examples: string[] | null;
    suggestion: string | null;
  }>;
  metrics?: SessionMetricSnapshot[];
  pronunciationReport?: PronunciationReportDetail | null;
  workoutNumber?: number;
}

export interface UseSessionStatusReturn {
  session: SessionDetail | null;
  isLoading: boolean;
  isProcessing: boolean;
  isDone: boolean;
  isFailed: boolean;
  error: string | null;
  retry: () => void;
}
