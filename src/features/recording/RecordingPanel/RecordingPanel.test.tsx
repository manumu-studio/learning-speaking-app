// Component tests for RecordingPanel — idle UI with recorder hook mocked for jsdom
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RecordingPanel } from './RecordingPanel';

vi.mock('@/features/recording/useAudioRecorder', () => ({
  useAudioRecorder: () => ({
    state: 'idle' as const,
    duration: 0,
    audioBlob: null,
    error: null,
    startRecording: vi.fn().mockResolvedValue(undefined),
    stopRecording: vi.fn(),
    resetRecording: vi.fn(),
  }),
}));

vi.mock('@/features/session', () => ({
  useUploadSession: () => ({
    upload: vi.fn().mockResolvedValue('session-id'),
    isUploading: false,
    error: null,
  }),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
}));

describe('RecordingPanel', () => {
  beforeEach(() => {
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: {
        getUserMedia: vi.fn().mockResolvedValue({
          getTracks: () => [],
        }),
      },
    });
  });

  it('renders start recording control when idle', () => {
    render(<RecordingPanel />);
    expect(screen.getByRole('button', { name: /start recording/i })).toBeInTheDocument();
  });

  it('start control has descriptive accessible name', () => {
    render(<RecordingPanel />);
    const btn = screen.getByRole('button', { name: /start recording/i });
    expect(btn).toHaveAccessibleName();
  });

  it('does not show stop recording control while idle', () => {
    render(<RecordingPanel />);
    expect(screen.queryByRole('button', { name: /stop recording/i })).not.toBeInTheDocument();
  });
});
