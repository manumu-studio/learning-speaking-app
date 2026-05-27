// useAudioRecorder hook option and return types
import type { RecordingMode, RecordingStatus } from './recordingState.types';

export interface UseAudioRecorderOptions {
  recordingMode?: RecordingMode;
  maxDurationSecs?: number | null;
  onSegmentReady?: (blob: Blob, segmentDuration: number, segmentIndex: number) => void;
  warningBeforeSplitSecs?: number;
  onWarning?: (secondsRemaining: number) => void;
}

export interface UseAudioRecorderReturn {
  state: RecordingStatus;
  duration: number;
  audioBlob: Blob | null;
  mimeType: string | null;
  mediaStream: MediaStream | null;
  vadWarning: { message: string; canProceed: true } | null;
  error: string | null;
  recordingMode: RecordingMode;
  startRecording: () => Promise<void>;
  stopRecording: () => void;
  completeValidation: (vadWarning: { message: string; canProceed: true } | null) => void;
  failValidation: (message: string) => void;
  resetRecording: () => void;
  segmentIndex: number;
  isAutoSegmenting: boolean;
  secondsUntilSplit: number | null;
}
