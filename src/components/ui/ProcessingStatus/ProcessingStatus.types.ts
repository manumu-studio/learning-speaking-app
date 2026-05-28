// Type definitions for ProcessingStatus component
export interface ProcessingStatusProps {
  status: 'CREATED' | 'UPLOADED' | 'CHUNKS_PROCESSING' | 'TRANSCRIBING' | 'SCORING' | 'ANALYZING' | 'DONE' | 'FAILED';
  errorMessage?: string | null;
  onRetry?: () => void;
}
