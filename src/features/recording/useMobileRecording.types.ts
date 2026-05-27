// useMobileRecording hook option and return types

export interface UseMobileRecordingOptions {
  isRecording: boolean;
  mediaStream: MediaStream | null;
  startRecording: () => Promise<void>;
  stopRecording: () => void;
  onInterrupted: (message: string) => void;
}

export interface UseMobileRecordingReturn {
  startWithMobilePolish: () => Promise<void>;
  stopWithMobilePolish: () => void;
}
