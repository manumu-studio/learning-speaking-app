// Type definitions for ProcessingStatus component
export interface ProcessingStatusProps {
  status: 'CREATED' | 'UPLOADED' | 'CHUNKS_PROCESSING' | 'AWAITING_FINAL' | 'PROCESSING_FINAL' | 'TRANSCRIBING' | 'SCORING' | 'ANALYZING' | 'DONE' | 'FAILED';
  errorMessage?: string | null;
  onRetry?: () => void;
}
