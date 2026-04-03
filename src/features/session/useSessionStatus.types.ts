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

/**
 * Full session the client polls while processing — transcript and insights load when the server includes them.
 * Status values align with Prisma `SessionStatus`.
 */
export interface SessionDetail {
  id: string;
  status: 'CREATED' | 'UPLOADED' | 'TRANSCRIBING' | 'ANALYZING' | 'DONE' | 'FAILED';
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
