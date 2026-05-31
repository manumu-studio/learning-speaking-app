// Component tests for RecordingPanel — idle UI with recorder hook mocked for jsdom
import { axe } from '@/__mocks__/rtl-setup';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ProcessingSessionsProvider } from '@/features/session/ProcessingSessionsContext';
import { RecordingPanel } from './RecordingPanel';

vi.mock('@/features/recording/useAudioWorklet', () => ({
  useAudioWorklet: () => ({
    state: 'idle' as const,
    duration: 0,
    chunkIndex: 0,
    mediaStream: null,
    captureMode: 'audioworklet' as const,
    error: null,
    warnings: [],
    startRecording: vi.fn().mockResolvedValue(undefined),
    stopRecording: vi.fn().mockResolvedValue(undefined),
    resetRecording: vi.fn(),
  }),
}));

vi.mock('@/features/recording/useChunkUploader', () => ({
  useChunkUploader: () => ({
    chunks: [],
    sessionId: null,
    uploadChunk: vi.fn(),
    completeSession: vi.fn().mockResolvedValue(null),
    ensureSession: vi.fn().mockResolvedValue('session-id'),
    isUploading: false,
    error: null,
    resetUploader: vi.fn(),
  }),
}));

vi.mock('@/features/recording/useSileroVad', () => ({
  useSileroVad: () => ({
    status: 'idle' as const,
    analyzeBlob: vi.fn().mockResolvedValue({ outcome: 'speech-detected' }),
    reset: vi.fn(),
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
