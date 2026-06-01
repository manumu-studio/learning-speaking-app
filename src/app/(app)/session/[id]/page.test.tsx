// Tests for session results page — insight rendering, category badges, pronunciation scores
/** @vitest-environment jsdom */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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
    transcript: { text: 'I have car and need to make the process better.', improvedText: null, wordsUsed: [], wordCount: 10 },
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

  it('renders both insight patterns for a completed session', async () => {
    const user = userEvent.setup();
    render(<SessionResultsPage params={Promise.resolve({ id: 'sess-test' })} />);

    await screen.findByText('Strong session overall.');
    const languageBtn = screen.getByRole('button', { name: /Language Feedback/i });
    await user.click(languageBtn);

    const grammarBtn = await screen.findByRole('button', { name: /Grammar/i });
    await user.click(grammarBtn);
    const vocabBtn = screen.getByRole('button', { name: /Vocabulary/i });
    await user.click(vocabBtn);

    expect(await screen.findByRole('heading', { name: 'establish' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Article usage' })).toBeInTheDocument();
  });

  it('renders insight category badges', async () => {
    const user = userEvent.setup();
    render(<SessionResultsPage params={Promise.resolve({ id: 'sess-test' })} />);

    await screen.findByText('Strong session overall.');
    const languageBtn = screen.getByRole('button', { name: /Language Feedback/i });
    await user.click(languageBtn);

    const grammarBtn = await screen.findByRole('button', { name: /Grammar/i });
    await user.click(grammarBtn);

    await screen.findAllByText('establish');
    const grammarBadges = screen.getAllByText('grammar');
    expect(grammarBadges.length).toBeGreaterThanOrEqual(1);

    const vocabBtn = screen.getByRole('button', { name: /Vocabulary/i });
    await user.click(vocabBtn);
    await screen.findByText('Article usage');
    const vocabularyBadges = screen.getAllByText('vocabulary');
    expect(vocabularyBadges.length).toBeGreaterThanOrEqual(1);
  });

  it('renders pronunciation section when report exists', async () => {
    render(<SessionResultsPage params={Promise.resolve({ id: 'sess-test' })} />);

    await screen.findByText('Strong session overall.');
    expect(
      screen.getByRole('button', { name: /Pronunciation & Intonation/i }),
    ).toBeInTheDocument();
  });

  it('does not render raw speaking rate wpm float', async () => {
    render(<SessionResultsPage params={Promise.resolve({ id: 'sess-test' })} />);

    await screen.findByText('Strong session overall.');
    expect(screen.queryByText(/177\.2065707719806/)).not.toBeInTheDocument();
  });
});
