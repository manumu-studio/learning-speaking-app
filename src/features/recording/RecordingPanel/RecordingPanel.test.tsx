// Component tests for RecordingPanel — idle UI with recorder hook mocked for jsdom
import { axe } from '@/__mocks__/rtl-setup';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ProcessingSessionsProvider } from '@/features/session/ProcessingSessionsContext';
import { RecordingPanel } from './RecordingPanel';

vi.mock('@/features/recording/useAudioRecorder', () => ({
  useAudioRecorder: () => ({
    state: 'idle' as const,
    duration: 0,
    audioBlob: null,
    mimeType: null,
    mediaStream: null,
    vadWarning: null,
    error: null,
    recordingMode: 'press-to-toggle' as const,
    startRecording: vi.fn().mockResolvedValue(undefined),
    stopRecording: vi.fn(),
    completeValidation: vi.fn(),
    failValidation: vi.fn(),
    resetRecording: vi.fn(),
    segmentIndex: 0,
    isAutoSegmenting: false,
    secondsUntilSplit: null,
    timeLimitSecs: null,
  }),
}));

vi.mock('@/features/recording/useSegmentUploader', () => ({
  useSegmentUploader: () => ({
    segments: [],
    uploadSegment: vi.fn(),
    totalUploaded: 0,
    totalFailed: 0,
    isUploading: false,
    latestSessionId: null,
  }),
}));

vi.mock('@/features/recording/useSileroVad', () => ({
  useSileroVad: () => ({
    status: 'idle' as const,
    analyzeBlob: vi.fn().mockResolvedValue({ outcome: 'speech-detected' }),
    reset: vi.fn(),
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

vi.mock('@/features/recording/RecordingContext', () => ({
  useRecordingContext: () => ({
    todaySessionCount: 0,
    nextRecordingNumber: 1,
    isLoading: false,
    error: null,
  }),
  RecordingContext: () => null,
}));

vi.mock('@/features/recording/useMobileRecording', () => ({
  useMobileRecording: ({
    startRecording,
    stopRecording,
  }: {
    startRecording: () => Promise<void>;
    stopRecording: () => void;
  }) => ({
    startWithMobilePolish: startRecording,
    stopWithMobilePolish: stopRecording,
  }),
}));

vi.mock('@/features/recording/useSilenceDetector', () => ({
  useSilenceDetector: () => ({
    isPausedBySilence: false,
  }),
}));

function renderPanel() {
  return render(
    <ProcessingSessionsProvider>
      <RecordingPanel />
    </ProcessingSessionsProvider>,
  );
}

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
    renderPanel();
    expect(screen.getByRole('button', { name: /start recording/i })).toBeInTheDocument();
  });

  it('start control has descriptive accessible name', () => {
    renderPanel();
    const btn = screen.getByRole('button', { name: /start recording/i });
    expect(btn).toHaveAccessibleName();
  });

  it('does not show stop recording control while idle', () => {
    renderPanel();
    expect(screen.queryByRole('button', { name: /stop recording/i })).not.toBeInTheDocument();
  });

  it('has no axe accessibility violations', async () => {
    const { container } = renderPanel();
    expect(await axe(container)).toHaveNoViolations();
  });
});
