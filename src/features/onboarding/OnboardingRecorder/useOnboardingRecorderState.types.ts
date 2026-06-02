// Types for the useOnboardingRecorderState hook return value
import type { RecordingStatus, VadPreflightWarning } from '@/features/recording/recordingState.types';

export interface OnboardingRecorderState {
  uiState: RecordingStatus;
  duration: number;
  mediaStream: MediaStream | null;
  audioPreviewUrl: string | null;
  vadWarning: VadPreflightWarning | null;
  isPausedBySilence: boolean;
  isUploading: boolean;
  isAnalyzing: boolean;
  error: string | null;
  startWithMobilePolish: () => void;
  stopWithMobilePolish: () => void;
  handleUpload: () => void;
  resetSession: () => void;
}
