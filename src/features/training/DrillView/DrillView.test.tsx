// Component tests for DrillView — loading, errors, prompt, processing, feedback
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { UseDrillReturn } from './useDrill';
import { DrillView } from './DrillView';

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    replace: vi.fn(),
    back: vi.fn(),
    push: vi.fn(),
  }),
}));

vi.mock('./useDrill');
vi.mock('@/features/recording/useAudioRecorder');

import { useDrill } from './useDrill';
import { useAudioRecorder } from '@/features/recording/useAudioRecorder';

const mockUseDrill = vi.mocked(useDrill);
const mockUseAudioRecorder = vi.mocked(useAudioRecorder);

const baseDrill = {
  id: 'd1',
  sessionId: 's1',
  drillType: 'rephrase' as const,
  prompt: 'Practice this phrase',
  sourceExample: null,
  timeLimit: 90,
  metricKey: 'connectorRepetition',
  metricLabel: 'Connector Repetition',
};

function drillReturn(partial: Partial<UseDrillReturn>): UseDrillReturn {
  return {
    state: partial.state ?? 'prompt',
    drill: partial.drill ?? null,
    feedback: partial.feedback ?? null,
    error: partial.error ?? null,
    isLoading: partial.isLoading ?? false,
    startRecording: partial.startRecording ?? vi.fn(),
    stopRecording: partial.stopRecording ?? vi.fn().mockResolvedValue(undefined),
    tryAgain: partial.tryAgain ?? vi.fn().mockResolvedValue(null),
  };
}

describe('DrillView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAudioRecorder.mockReturnValue({
      state: 'idle',
      duration: 0,
      audioBlob: null,
      mimeType: null,
      mediaStream: null,
      vadWarning: null,
      error: null,
      recordingMode: 'press-to-toggle',
      startRecording: vi.fn().mockResolvedValue(undefined),
      stopRecording: vi.fn(),
      completeValidation: vi.fn(),
      failValidation: vi.fn(),
      resetRecording: vi.fn(),
    });
  });

  it('renders loading state', () => {
    mockUseDrill.mockReturnValue(
      drillReturn({ isLoading: true, drill: null, state: 'prompt' }),
    );
    render(<DrillView drillId="d1" />);
    expect(screen.getByText('Loading drill...')).toBeInTheDocument();
  });

  it('renders error when load failed and there is no drill', () => {
    mockUseDrill.mockReturnValue(
      drillReturn({
        isLoading: false,
        drill: null,
        error: 'Failed to load drill',
        state: 'prompt',
      }),
    );
    render(<DrillView drillId="d1" />);
    expect(screen.getByText('Failed to load drill')).toBeInTheDocument();
  });

  it('renders drill prompt when loaded in prompt state', () => {
    mockUseDrill.mockReturnValue(
      drillReturn({
        isLoading: false,
        drill: baseDrill,
        state: 'prompt',
        error: null,
      }),
    );
    render(<DrillView drillId="d1" />);
    expect(screen.getByText('Practice this phrase')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Start recording' })).toBeInTheDocument();
  });

  it('shows inline error banner when drill exists but submission failed', () => {
    mockUseDrill.mockReturnValue(
      drillReturn({
        isLoading: false,
        drill: baseDrill,
        state: 'prompt',
        error: 'Failed to submit drill',
      }),
    );
    render(<DrillView drillId="d1" />);
    expect(screen.getByText('Failed to submit drill')).toBeInTheDocument();
  });

  it('renders processing state', () => {
    mockUseDrill.mockReturnValue(
      drillReturn({
        isLoading: false,
        drill: baseDrill,
        state: 'processing',
      }),
    );
    render(<DrillView drillId="d1" />);
    expect(screen.getByText('Analyzing your response...')).toBeInTheDocument();
  });

  it('renders feedback state with feedback text', () => {
    mockUseDrill.mockReturnValue(
      drillReturn({
        isLoading: false,
        drill: baseDrill,
        state: 'feedback',
        feedback: { feedback: 'Great clarity.', improved: true },
      }),
    );
    render(<DrillView drillId="d1" />);
    expect(screen.getByText('Great clarity.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Try Again' })).toBeInTheDocument();
  });
});
