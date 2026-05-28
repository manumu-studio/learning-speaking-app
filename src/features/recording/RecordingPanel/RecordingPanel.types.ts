// RecordingPanel component prop types
import type { RecordingMode } from '@/features/recording/recordingState.types';

export interface RecordingPanelProps {
  topic?: string;
  focus?: { focusKey: string; focusLabel: string } | null;
  recordingMode?: RecordingMode;
  promptUsed?: string | null;
}
