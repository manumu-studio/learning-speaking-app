// Tests for session results page layout — collapsible sections and grouped feedback
/** @vitest-environment jsdom */
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { SessionDetail } from '@/features/session/useSessionStatus.types';

vi.mock('react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react')>();
  return {
    ...actual,
    use: <T,>(usable: T): T => {
      if (
        usable !== null &&
        typeof usable === 'object' &&
        'then' in usable &&
        typeof (usable as unknown as Promise<unknown>).then === 'function'
      ) {
        return { id: 'sess-test' } as T;
      }
      return actual.use(usable as Parameters<typeof actual.use<T>>[0]);
    },
  };
});

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock('@/features/session/useSessionStatus', () => ({
  useSessionStatus: vi.fn(),
}));

vi.mock('@/components/ui/PersonalRecordBanner', () => ({
  PersonalRecordBanner: () => null,
  usePersonalRecordBanner: () => ({ personalRecords: [] }),
}));

vi.mock('@/components/ui/PitchContour', () => ({
  PitchContour: () => <div>Pitch Contour</div>,
  usePitchContour: () => ({ status: 'idle' as const }),
}));

vi.mock('@/features/training/DrillRecommendation', () => ({
  DrillRecommendation: () => null,
}));

import { useSessionStatus } from '@/features/session/useSessionStatus';
import SessionResultsPage from './page';

const mockWord = {
  word: 'hello',
  accuracyScore: 90,
  errorType: 'None',
  offsetMs: 0,
  durationMs: 500,
  phonemes: [],
  l1Tags: [],
  breakErrorTypes: [],
  intonationErrorTypes: [],
  monotonePitchDelta: null,
};

function buildDoneSession(overrides: Partial<SessionDetail> = {}): SessionDetail {
  return {
    id: 'sess-test',
    status: 'DONE',
    durationSecs: 60,
    topic: null,
    focusNext: null,
    summary: 'Strong session overall.',
    errorMessage: null,
    focusMetricKey: null,
    createdAt: '2026-05-31T00:00:00.000Z',
    insights: [
      {
        id: 'ins-1',
        category: 'grammar',
        pattern: 'Article usage',
        detail: 'Missing articles before nouns.',
        frequency: 2,
        severity: 'medium',
        examples: ['I have car → I have a car'],
        suggestion: 'Add a/an before singular count nouns.',
      },
      {
        id: 'ins-2',
        category: 'vocabulary',
        pattern: 'establish',
        detail: 'A precise verb for formal contexts.',
        frequency: 1,
        severity: 'low',
        examples: ['We need to make the process better'],
        suggestion: 'We need to establish a clearer process.',
      },
    ],
    metrics: [],
    transcript: { text: 'I have car and need to make the process better.', wordCount: 10 },
    pronunciationReport: {
      pronScore: 80,
      accuracyScore: 85,
      fluencyScore: 78,
      completenessScore: 90,
      prosodyScore: 7.2,
      speakingRateWpm: 177.2065707719806,
      failureReason: null,
      words: [mockWord],
    },
    ...overrides,
  };
}

describe('SessionResultsPage', () => {
  beforeEach(() => {
    vi.mocked(useSessionStatus).mockReturnValue({
      session: buildDoneSession(),
      isLoading: false,
      isProcessing: false,
      isDone: true,
      isFailed: false,
      error: null,
      retry: vi.fn(),
    });
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve({
          ok: false,
          json: () => Promise.resolve({}),
        }),
      ),
    );
  });

  it('renders Language Feedback and Pronunciation sections expanded by default', async () => {
    render(<SessionResultsPage params={Promise.resolve({ id: 'sess-test' })} />);

    expect(await screen.findByRole('button', { name: /Language Feedback/i })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
    expect(screen.getByRole('button', { name: /Pronunciation & Intonation/i })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
  });

  it('groups insights under Grammar and Vocabulary sub-sections', async () => {
    render(<SessionResultsPage params={Promise.resolve({ id: 'sess-test' })} />);

    expect(await screen.findByRole('button', { name: /Grammar/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Vocabulary/i })).toBeInTheDocument();
    expect(screen.getByText(/You said:/)).toBeInTheDocument();
    expect(screen.getByText(/Words to Add/)).toBeInTheDocument();
  });

  it('collapses Word Color Map and Prosody Feedback by default', async () => {
    render(<SessionResultsPage params={Promise.resolve({ id: 'sess-test' })} />);

    expect(await screen.findByRole('button', { name: /Word Color Map/i })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
    expect(screen.getByRole('button', { name: /Prosody Feedback/i })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
  });

  it('does not render raw speaking rate wpm float', async () => {
    render(<SessionResultsPage params={Promise.resolve({ id: 'sess-test' })} />);

    await screen.findByRole('button', { name: /Pronunciation & Intonation/i });
    expect(screen.queryByText(/177\.2065707719806/)).not.toBeInTheDocument();
    expect(screen.queryByText(/177 wpm/i)).not.toBeInTheDocument();
  });
});
