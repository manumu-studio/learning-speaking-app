// Unit tests for recording state machine reducer transitions
import { describe, expect, it } from 'vitest';
import {
  initialRecordingState,
  recordingStateReducer,
} from './recordingStateMachine';

const payload = {
  audioBlob: new Blob(['audio'], { type: 'audio/webm' }),
  duration: 5,
  mimeType: 'audio/webm',
};

describe('recordingStateReducer', () => {
  it('starts in idle', () => {
    expect(initialRecordingState).toEqual({ status: 'idle' });
  });

  it('idle → recording on START_RECORDING', () => {
    const next = recordingStateReducer(initialRecordingState, {
      type: 'START_RECORDING',
      mimeType: 'audio/webm',
    });
    expect(next).toEqual({ status: 'recording', mimeType: 'audio/webm' });
  });

  it('ignores START_RECORDING when not idle', () => {
    const recording = { status: 'recording' as const, mimeType: 'audio/webm' };
    const next = recordingStateReducer(recording, {
      type: 'START_RECORDING',
      mimeType: 'audio/mp4',
    });
    expect(next).toBe(recording);
  });

  it('recording → validating on STOP_RECORDING', () => {
    const recording = { status: 'recording' as const, mimeType: 'audio/webm' };
    const next = recordingStateReducer(recording, {
      type: 'STOP_RECORDING',
      payload,
    });
    expect(next.status).toBe('validating');
    if (next.status === 'validating') {
      expect(next.duration).toBe(5);
      expect(next.mimeType).toBe('audio/webm');
    }
  });

  it('validating → stopped on VALIDATION_PASSED', () => {
    const validating = {
      status: 'validating' as const,
      ...payload,
    };
    const next = recordingStateReducer(validating, {
      type: 'VALIDATION_PASSED',
      vadWarning: null,
    });
    expect(next.status).toBe('stopped');
  });

  it('validating → stopped preserves VAD warning', () => {
    const validating = {
      status: 'validating' as const,
      ...payload,
    };
    const warning = {
      message: 'Background voices detected — find a quieter spot or proceed anyway.',
      canProceed: true as const,
    };
    const next = recordingStateReducer(validating, {
      type: 'VALIDATION_PASSED',
      vadWarning: warning,
    });
    if (next.status === 'stopped') {
      expect(next.vadWarning).toEqual(warning);
    }
  });

  it('validating → idle on VALIDATION_FAILED', () => {
    const validating = {
      status: 'validating' as const,
      ...payload,
    };
    const next = recordingStateReducer(validating, { type: 'VALIDATION_FAILED' });
    expect(next).toEqual({ status: 'idle' });
  });

  it('any state → idle on RESET', () => {
    const stopped = {
      status: 'stopped' as const,
      ...payload,
      vadWarning: null,
    };
    expect(recordingStateReducer(stopped, { type: 'RESET' })).toEqual({ status: 'idle' });
  });
});
