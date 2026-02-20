// Type definitions for ProcessingStatus component
export interface ProcessingStatusProps {
  status: 'UPLOADED' | 'TRANSCRIBING' | 'ANALYZING' | 'DONE' | 'FAILED';
  errorMessage?: string | null;
  onRetry?: () => void;
}
