// Type definitions for the DeleteSessionModal component
export interface DeleteSessionModalProps {
  isOpen: boolean;
  sessionId: string;
  onClose: () => void;
  onConfirm: () => void;
  isDeleting?: boolean;
}

export interface UseDeleteSessionModalReturn {
  isDeleting: boolean;
  error: string | null;
  deleteSession: (sessionId: string) => Promise<boolean>;
}
