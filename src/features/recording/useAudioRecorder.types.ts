// useAudioRecorder hook option and return types
import type { RecordingMode, RecordingStatus } from './recordingState.types';

export interface UseAudioRecorderOptions {
  recordingMode?: RecordingMode;
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
}
