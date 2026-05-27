// Pure reducer for recording lifecycle transitions (idle → recording → validating → stopped)
import type {
  RecordingMachineAction,
  RecordingMachineState,
} from './recordingState.types';

export const initialRecordingState: RecordingMachineState = { status: 'idle' };

export function recordingStateReducer(
  state: RecordingMachineState,
  action: RecordingMachineAction,
): RecordingMachineState {
  switch (action.type) {
    case 'START_RECORDING':
      if (state.status !== 'idle') return state;
      return { status: 'recording', mimeType: action.mimeType };

    case 'STOP_RECORDING':
      if (state.status !== 'recording') return state;
      return {
        status: 'validating',
        audioBlob: action.payload.audioBlob,
        duration: action.payload.duration,
        mimeType: action.payload.mimeType,
      };

    case 'VALIDATION_PASSED':
      if (state.status !== 'validating') return state;
      return {
        status: 'stopped',
        audioBlob: state.audioBlob,
        duration: state.duration,
        mimeType: state.mimeType,
        vadWarning: action.vadWarning,
      };

    case 'VALIDATION_FAILED':
      return { status: 'idle' };

    case 'RESET':
      return { status: 'idle' };

    default:
      return state;
  }
}
