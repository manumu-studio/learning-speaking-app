// RecordButton component prop types
import type { RecordingMode, RecordingStatus } from '@/features/recording/recordingState.types';

export interface RecordButtonProps {
  state: RecordingStatus;
  recordingMode?: RecordingMode;
  onStart: () => void;
  onStop: () => void;
  disabled?: boolean;
}
