// Types for Silero VAD pre-flight speech detection results
export type VadPreflightOutcome =
  | 'speech-detected'
  | 'no-speech'
  | 'multi-voice'
  | 'error';

export type VadStatus = 'idle' | 'loading' | 'running' | 'done';

export interface VadPreflightSpeechDetected {
  outcome: 'speech-detected';
}

export interface VadPreflightNoSpeech {
  outcome: 'no-speech';
  message: string;
}

export interface VadPreflightMultiVoice {
  outcome: 'multi-voice';
  message: string;
  canProceed: true;
}

export interface VadPreflightError {
  outcome: 'error';
  message: string;
}

export type VadPreflightResult =
  | VadPreflightSpeechDetected
  | VadPreflightNoSpeech
  | VadPreflightMultiVoice
  | VadPreflightError;

export interface UseSileroVadReturn {
  status: VadStatus;
  analyzeBlob: (blob: Blob) => Promise<VadPreflightResult>;
  reset: () => void;
}
