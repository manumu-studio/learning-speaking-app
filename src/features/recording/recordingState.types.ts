// Discriminated union types for the recording lifecycle state machine
export type RecordingStatus = 'idle' | 'recording' | 'validating' | 'stopped';

export type RecordingMode = 'press-to-toggle' | 'hold-to-record';

export interface RecordingPayload {
  audioBlob: Blob;
  duration: number;
  mimeType: string;
}

export interface VadPreflightWarning {
  message: string;
  canProceed: true;
}

export type RecordingMachineState =
  | { status: 'idle' }
  | { status: 'recording'; mimeType: string }
  | {
      status: 'validating';
      audioBlob: Blob;
      duration: number;
      mimeType: string;
    }
  | {
      status: 'stopped';
      audioBlob: Blob;
      duration: number;
      mimeType: string;
      vadWarning: VadPreflightWarning | null;
    };

export type RecordingMachineAction =
  | { type: 'START_RECORDING'; mimeType: string }
  | { type: 'STOP_RECORDING'; payload: RecordingPayload }
  | { type: 'VALIDATION_PASSED'; vadWarning: VadPreflightWarning | null }
  | { type: 'VALIDATION_FAILED' }
  | { type: 'RESET' };

export function getRecordingStatus(state: RecordingMachineState): RecordingStatus {
  return state.status;
}
