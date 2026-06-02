// Type definitions for ProcessingToast component

export type ToastSessionStatus =
  | 'UPLOADED'
  | 'CHUNKS_PROCESSING'
  | 'TRANSCRIBING'
  | 'SCORING'
  | 'ANALYZING'
  | 'DONE'
  | 'FAILED';

export interface ProcessingToastModalProps {
  sessionId: string;
  status: import('@/components/ui/ProcessingStatus/ProcessingStatus.types').ProcessingStatusProps['status'];
  toastStatus: ToastSessionStatus;
  errorMessage: string | null;
  onClose: () => void;
  onViewSession: (id: string) => void;
}

export interface ProcessingToastPillProps {
  toastStatus: ToastSessionStatus;
  extraCount: number;
  onClick: () => void;
}
