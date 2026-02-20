// Type definitions for useSessionStatus hook

export interface SessionDetail {
  id: string;
  status: 'CREATED' | 'UPLOADED' | 'TRANSCRIBING' | 'ANALYZING' | 'DONE' | 'FAILED';
  durationSecs: number | null;
  topic: string | null;
  focusNext: string | null;
  errorMessage: string | null;
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
