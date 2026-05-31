// Type definitions for CancelRecordingModal component
export interface CancelRecordingModalProps {
  isOpen: boolean;
  durationSecs: number;
  hasCompletedChunks: boolean;
  onDiscard: () => void;
  onFinishEarly: () => void;
  onDismiss: () => void;
}
