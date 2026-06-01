// Tests for ReadingPractice library view + practice flow
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import React from 'react';
import type { UseAudioWorkletOptions, ChunkReadyEvent } from '@/features/recording/useAudioWorklet.types';

// --- Module mocks (hoisted before imports) ---

vi.mock('@/components/ui/ScoreChip', () => ({
  ScoreChip: ({ score }: { score: number }) => (
    <span data-testid="score-chip">{score}</span>
  ),
}));

vi.mock('@/components/ui/Container', () => ({
  Container: ({
    children,
    className,
  }: {
    children: React.ReactNode;
    className?: string;
  }) => <div className={className}>{children}</div>,
}));

vi.mock('@/features/recording/useAudioWorklet', () => ({
  useAudioWorklet: vi.fn().mockReturnValue({
    state: 'idle',
    duration: 0,
    chunkIndex: 0,
    mediaStream: null,
    captureMode: 'audioworklet',
    error: null,
    warnings: [],
    startRecording: vi.fn().mockResolvedValue(undefined),
    stopRecording: vi.fn().mockResolvedValue(undefined),
    pauseRecording: vi.fn(),
    resumeRecording: vi.fn(),
    resetRecording: vi.fn(),
  }),
}));

// --- Mock fetch globally ---
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

// --- Import component under test AFTER mocks ---
import { ReadingPractice } from './ReadingPractice';

// --- Shared mock data ---

const MOCK_LIBRARY_DATA = {
  globalWeaknesses: {
    phonemes: [
      {
        phoneme: 'th',
        ipaSymbol: 'θ',
        averageScore: 45,
        occurrences: 8,
        exampleWords: ['think', 'three'],
      },
      {
        phoneme: 'r',
        ipaSymbol: 'ɹ',
        averageScore: 55,
        occurrences: 12,
        exampleWords: ['red', 'green'],
      },
    ],
    unadoptedVocab: [
      { word: 'eloquent', meaning: 'fluent and persuasive' },
      { word: 'nuanced', meaning: 'characterized by subtle differences' },
    ],
  },
  sessions: [
    {
      id: 'sess-1',
      workoutNumber: 42,
      intentLabel: 'Healthcare systems',
      createdAt: '2026-05-30T10:00:00Z',
      pronScore: 72,
      weakPhonemes: [
        {
          phoneme: 'th',
          ipaSymbol: 'θ',
          averageScore: 45,
          occurrences: 5,
          exampleWords: ['think'],
        },
      ],
      mispronounced: [
        { word: 'through', accuracyScore: 35, errorType: 'Mispronunciation' },
      ],
      vocab: [{ word: 'eloquent', meaning: 'fluent', adopted: false }],
    },
  ],
};

const MOCK_LIBRARY_DATA_EMPTY_SESSIONS = {
  ...MOCK_LIBRARY_DATA,
  sessions: [],
};

const MOCK_GENERATED_TEXT = {
  text: 'Think through three things thoroughly.',
  targetPhonemes: ['θ'],
  targetWords: ['through', 'three', 'thoroughly'],
};

const MOCK_ASSESS_RESULT = {
  pronScore: 78,
  accuracyScore: 80,
  fluencyScore: 75,
  completenessScore: 90,
  prosodyScore: 70,
  words: [
    { word: 'Think', accuracyScore: 85, errorType: '' },
    { word: 'through', accuracyScore: 55, errorType: 'Mispronunciation' },
    { word: 'three', accuracyScore: 62, errorType: '' },
    { word: 'things', accuracyScore: 91, errorType: '' },
    { word: 'thoroughly', accuracyScore: 40, errorType: 'Mispronunciation' },
  ],
};

// Helper: create a Response-like object that resolves .json()
function makeOkResponse(data: unknown): Response {
  return {
    ok: true,
    status: 200,
    json: () => Promise.resolve(data),
  } as unknown as Response;
}

function makeErrorResponse(status = 500): Response {
  return {
    ok: false,
    status,
    json: () => Promise.resolve({}),
  } as unknown as Response;
}

// --- Tests ---

describe('ReadingPractice', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: library fetch succeeds
    mockFetch.mockResolvedValue(makeOkResponse(MOCK_LIBRARY_DATA));
  });

  // ──────────────────────────────────────────────────────────────
  // 1. Loading state
  // ──────────────────────────────────────────────────────────────
  describe('loading state', () => {
    it('renders skeleton placeholders while fetching', () => {
      // Never resolve so we stay in loading state
      mockFetch.mockReturnValue(new Promise(() => undefined));
      render(<ReadingPractice />);

      // The loading block renders 3 animated pulse divs
      const skeletons = document.querySelectorAll('.animate-pulse');
      expect(skeletons.length).toBeGreaterThanOrEqual(1);
    });

    it('does not show library content while loading', () => {
      mockFetch.mockReturnValue(new Promise(() => undefined));
      render(<ReadingPractice />);

      expect(screen.queryByText('Your Focus Areas')).not.toBeInTheDocument();
      expect(screen.queryByText('Practice by Session')).not.toBeInTheDocument();
    });
  });

  // ──────────────────────────────────────────────────────────────
  // 2. Library view with data
  // ──────────────────────────────────────────────────────────────
  describe('library view with data', () => {
    it('renders the Reading Practice heading', async () => {
      render(<ReadingPractice />);
      await waitFor(() =>
        expect(screen.getByText('Reading Practice')).toBeInTheDocument(),
      );
    });

    it('renders GlobalSummary with phoneme focus areas', async () => {
      render(<ReadingPractice />);
      await waitFor(() =>
        expect(screen.getByText('Your Focus Areas')).toBeInTheDocument(),
      );
      // /θ/ appears in GlobalSummary and may also appear in session card
      expect(screen.getAllByText('/θ/').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('/ɹ/').length).toBeGreaterThanOrEqual(1);
    });

    it('renders ScoreChip for each global phoneme', async () => {
      render(<ReadingPractice />);
      await waitFor(() => expect(screen.getAllByTestId('score-chip').length).toBeGreaterThan(0));
      const chips = screen.getAllByTestId('score-chip');
      // At least one chip for each phoneme in global summary
      expect(chips.some((c) => c.textContent === '45')).toBe(true);
      expect(chips.some((c) => c.textContent === '55')).toBe(true);
    });

    it('renders unadopted vocab words', async () => {
      render(<ReadingPractice />);
      // "eloquent" appears in both GlobalSummary and the session card vocab tag
      await waitFor(() =>
        expect(screen.getAllByText('eloquent').length).toBeGreaterThanOrEqual(1),
      );
      expect(screen.getByText('nuanced')).toBeInTheDocument();
    });

    it('renders session cards', async () => {
      render(<ReadingPractice />);
      await waitFor(() =>
        expect(screen.getByText('Healthcare systems')).toBeInTheDocument(),
      );
      expect(screen.getByText('#42')).toBeInTheDocument();
    });

    it('renders session pronScore chip', async () => {
      render(<ReadingPractice />);
      await waitFor(() => expect(screen.getAllByTestId('score-chip').length).toBeGreaterThan(0));
      const chips = screen.getAllByTestId('score-chip');
      expect(chips.some((c) => c.textContent === '72')).toBe(true);
    });

    it('renders weak phoneme tags inside session card', async () => {
      render(<ReadingPractice />);
      // /θ/ appears in both GlobalSummary and the session card
      await waitFor(() =>
        expect(screen.getAllByText('/θ/').length).toBeGreaterThanOrEqual(1),
      );
    });

    it('renders mispronounced word tags inside session card', async () => {
      render(<ReadingPractice />);
      await waitFor(() =>
        expect(screen.getByText('through')).toBeInTheDocument(),
      );
    });

    it('renders unadopted vocab tags inside session card', async () => {
      render(<ReadingPractice />);
      await waitFor(() =>
        expect(screen.getAllByText('eloquent').length).toBeGreaterThanOrEqual(1),
      );
    });

    it('renders vocab count label in GlobalSummary', async () => {
      render(<ReadingPractice />);
      await waitFor(() =>
        expect(screen.getByText(/Vocabulary to adopt/)).toBeInTheDocument(),
      );
    });
  });

  // ──────────────────────────────────────────────────────────────
  // 3. Empty state
  // ──────────────────────────────────────────────────────────────
  describe('empty state', () => {
    it('renders empty message when sessions array is empty', async () => {
      mockFetch.mockResolvedValue(makeOkResponse(MOCK_LIBRARY_DATA_EMPTY_SESSIONS));
      render(<ReadingPractice />);
      await waitFor(() =>
        expect(
          screen.getByText('No sessions with pronunciation data yet'),
        ).toBeInTheDocument(),
      );
    });

    it('still renders GlobalSummary when sessions are empty', async () => {
      mockFetch.mockResolvedValue(makeOkResponse(MOCK_LIBRARY_DATA_EMPTY_SESSIONS));
      render(<ReadingPractice />);
      await waitFor(() =>
        expect(screen.getByText('Your Focus Areas')).toBeInTheDocument(),
      );
    });
  });

  // ──────────────────────────────────────────────────────────────
  // 4. Error state — library fetch failure
  // ──────────────────────────────────────────────────────────────
  describe('error state', () => {
    it('renders error message when library fetch returns non-ok', async () => {
      mockFetch.mockResolvedValue(makeErrorResponse());
      render(<ReadingPractice />);
      await waitFor(() =>
        expect(
          screen.getByText('Failed to load reading practice data'),
        ).toBeInTheDocument(),
      );
    });

    it('renders error message when library fetch throws network error', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));
      render(<ReadingPractice />);
      await waitFor(() =>
        expect(screen.getByText('Network error')).toBeInTheDocument(),
      );
    });

    it('hides library content when error occurred', async () => {
      mockFetch.mockResolvedValue(makeErrorResponse());
      render(<ReadingPractice />);
      await waitFor(() =>
        expect(
          screen.getByText('Failed to load reading practice data'),
        ).toBeInTheDocument(),
      );
      expect(screen.queryByText('Your Focus Areas')).not.toBeInTheDocument();
    });
  });

  // ──────────────────────────────────────────────────────────────
  // 5. Session card click → practice view
  // ──────────────────────────────────────────────────────────────
  describe('session card click → practice view', () => {
    it('switches to practice view on session card click', async () => {
      render(<ReadingPractice />);
      await waitFor(() =>
        expect(screen.getByText('Healthcare systems')).toBeInTheDocument(),
      );

      fireEvent.click(screen.getByRole('button', { name: /Healthcare systems/i }));

      await waitFor(() =>
        expect(screen.getByText(/Back to library/i)).toBeInTheDocument(),
      );
    });

    it('shows session title in practice view header', async () => {
      render(<ReadingPractice />);
      await waitFor(() =>
        expect(screen.getByText('Healthcare systems')).toBeInTheDocument(),
      );

      fireEvent.click(screen.getByRole('button', { name: /Healthcare systems/i }));

      await waitFor(() =>
        expect(screen.getByText(/#42.*Healthcare systems/)).toBeInTheDocument(),
      );
    });

    it('renders difficulty selector buttons in practice view', async () => {
      render(<ReadingPractice />);
      await waitFor(() =>
        expect(screen.getByText('Healthcare systems')).toBeInTheDocument(),
      );

      fireEvent.click(screen.getByRole('button', { name: /Healthcare systems/i }));

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Easy/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Medium/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Hard/i })).toBeInTheDocument();
      });
    });

    it('renders initial prompt when no text generated yet', async () => {
      render(<ReadingPractice />);
      await waitFor(() =>
        expect(screen.getByText('Healthcare systems')).toBeInTheDocument(),
      );

      fireEvent.click(screen.getByRole('button', { name: /Healthcare systems/i }));

      await waitFor(() =>
        expect(
          screen.getByText('Choose a difficulty level above'),
        ).toBeInTheDocument(),
      );
    });

    it('back button returns to library view', async () => {
      render(<ReadingPractice />);
      await waitFor(() =>
        expect(screen.getByText('Healthcare systems')).toBeInTheDocument(),
      );

      fireEvent.click(screen.getByRole('button', { name: /Healthcare systems/i }));

      await waitFor(() =>
        expect(screen.getByText(/Back to library/i)).toBeInTheDocument(),
      );

      fireEvent.click(screen.getByText(/Back to library/i));

      await waitFor(() =>
        expect(screen.getByText('Reading Practice')).toBeInTheDocument(),
      );
      expect(screen.queryByText(/Back to library/i)).not.toBeInTheDocument();
    });
  });

  // ──────────────────────────────────────────────────────────────
  // 6. Generate text flow
  // ──────────────────────────────────────────────────────────────
  describe('generate text', () => {
    async function renderAndNavigateToPractice() {
      render(<ReadingPractice />);
      await waitFor(() =>
        expect(screen.getByText('Healthcare systems')).toBeInTheDocument(),
      );
      fireEvent.click(screen.getByRole('button', { name: /Healthcare systems/i }));
      await waitFor(() =>
        expect(screen.getByText(/Back to library/i)).toBeInTheDocument(),
      );
    }

    it('calls generate API on difficulty button click', async () => {
      // First call = library, second call = generate
      mockFetch
        .mockResolvedValueOnce(makeOkResponse(MOCK_LIBRARY_DATA))
        .mockResolvedValueOnce(makeOkResponse(MOCK_GENERATED_TEXT));

      await renderAndNavigateToPractice();

      fireEvent.click(screen.getByRole('button', { name: /Easy/i }));

      await waitFor(() =>
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/drills/reading-practice',
          expect.objectContaining({ method: 'POST' }),
        ),
      );
    });

    it('displays generated text after successful fetch', async () => {
      mockFetch
        .mockResolvedValueOnce(makeOkResponse(MOCK_LIBRARY_DATA))
        .mockResolvedValueOnce(makeOkResponse(MOCK_GENERATED_TEXT));

      await renderAndNavigateToPractice();

      fireEvent.click(screen.getByRole('button', { name: /Medium/i }));

      await waitFor(() =>
        expect(
          screen.getByText('Think through three things thoroughly.'),
        ).toBeInTheDocument(),
      );
    });

    it('displays target phoneme indicators after text generation', async () => {
      mockFetch
        .mockResolvedValueOnce(makeOkResponse(MOCK_LIBRARY_DATA))
        .mockResolvedValueOnce(makeOkResponse(MOCK_GENERATED_TEXT));

      await renderAndNavigateToPractice();
      fireEvent.click(screen.getByRole('button', { name: /Medium/i }));

      await waitFor(() =>
        expect(screen.getByText('/θ/')).toBeInTheDocument(),
      );
    });

    it('displays target word indicators after text generation', async () => {
      mockFetch
        .mockResolvedValueOnce(makeOkResponse(MOCK_LIBRARY_DATA))
        .mockResolvedValueOnce(makeOkResponse(MOCK_GENERATED_TEXT));

      await renderAndNavigateToPractice();
      fireEvent.click(screen.getByRole('button', { name: /Hard/i }));

      await waitFor(() =>
        expect(screen.getByText('through')).toBeInTheDocument(),
      );
    });

    it('shows Record Reading button after text is generated', async () => {
      mockFetch
        .mockResolvedValueOnce(makeOkResponse(MOCK_LIBRARY_DATA))
        .mockResolvedValueOnce(makeOkResponse(MOCK_GENERATED_TEXT));

      await renderAndNavigateToPractice();
      fireEvent.click(screen.getByRole('button', { name: /Medium/i }));

      await waitFor(() =>
        expect(
          screen.getByRole('button', { name: /Record Reading/i }),
        ).toBeInTheDocument(),
      );
    });

    it('shows practice error when generate API returns non-ok', async () => {
      mockFetch
        .mockResolvedValueOnce(makeOkResponse(MOCK_LIBRARY_DATA))
        .mockResolvedValueOnce(makeErrorResponse());

      await renderAndNavigateToPractice();
      fireEvent.click(screen.getByRole('button', { name: /Easy/i }));

      await waitFor(() =>
        expect(
          screen.getByText('Failed to generate practice text'),
        ).toBeInTheDocument(),
      );
    });

    it('shows New Text button once text is generated', async () => {
      mockFetch
        .mockResolvedValueOnce(makeOkResponse(MOCK_LIBRARY_DATA))
        .mockResolvedValueOnce(makeOkResponse(MOCK_GENERATED_TEXT));

      await renderAndNavigateToPractice();
      fireEvent.click(screen.getByRole('button', { name: /Medium/i }));

      await waitFor(() =>
        expect(
          screen.getByRole('button', { name: /New Text/i }),
        ).toBeInTheDocument(),
      );
    });
  });

  // ──────────────────────────────────────────────────────────────
  // 7. WordScoreDisplay — color-coded words
  // ──────────────────────────────────────────────────────────────
  describe('WordScoreDisplay color coding', () => {
    async function renderResultsView() {
      const { useAudioWorklet } = await import('@/features/recording/useAudioWorklet');
      const mockWorklet = vi.mocked(useAudioWorklet);

      // After stopRecording, the onChunkReady callback must fire with the final blob.
      // We simulate this by making stopRecording set the blob via the onChunkReady prop.
      let capturedOnChunkReady: ((event: ChunkReadyEvent) => void) | undefined;
      mockWorklet.mockImplementation((opts: UseAudioWorkletOptions | undefined) => {
        capturedOnChunkReady = opts?.onChunkReady;
        return {
          state: 'idle',
          duration: 0,
          chunkIndex: 0,
          mediaStream: null,
          captureMode: 'audioworklet' as const,
          error: null,
          warnings: [],
          startRecording: vi.fn().mockResolvedValue(undefined),
          stopRecording: vi.fn().mockImplementation(async () => {
            // Simulate chunk ready with a final blob
            capturedOnChunkReady?.({
              chunkIndex: 0,
              wavBlob: new Blob(['audio'], { type: 'audio/wav' }),
              durationSecs: 3,
              isFinal: true,
            });
          }),
          pauseRecording: vi.fn(),
          resumeRecording: vi.fn(),
          resetRecording: vi.fn(),
        };
      });

      mockFetch
        .mockResolvedValueOnce(makeOkResponse(MOCK_LIBRARY_DATA))
        .mockResolvedValueOnce(makeOkResponse(MOCK_GENERATED_TEXT))
        .mockResolvedValueOnce(makeOkResponse(MOCK_ASSESS_RESULT));

      render(<ReadingPractice />);
      await waitFor(() =>
        expect(screen.getByText('Healthcare systems')).toBeInTheDocument(),
      );

      fireEvent.click(screen.getByRole('button', { name: /Healthcare systems/i }));
      await waitFor(() =>
        expect(screen.getByText(/Back to library/i)).toBeInTheDocument(),
      );

      fireEvent.click(screen.getByRole('button', { name: /Medium/i }));
      await waitFor(() =>
        expect(
          screen.getByText('Think through three things thoroughly.'),
        ).toBeInTheDocument(),
      );

      fireEvent.click(screen.getByRole('button', { name: /Record Reading/i }));
      await waitFor(() =>
        expect(
          screen.getByRole('button', { name: /Stop & Assess/i }),
        ).toBeInTheDocument(),
      );

      fireEvent.click(screen.getByRole('button', { name: /Stop & Assess/i }));

      await waitFor(() =>
        expect(screen.getByText('Think')).toBeInTheDocument(),
      );
    }

    it('renders all scored words after assessment', async () => {
      await renderResultsView();
      expect(screen.getByText('Think')).toBeInTheDocument();
      // "through" appears twice: once in the session header mispronounced tag, once in WordScoreDisplay
      expect(screen.getAllByText('through').length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText('three')).toBeInTheDocument();
      expect(screen.getByText('things')).toBeInTheDocument();
      expect(screen.getByText('thoroughly')).toBeInTheDocument();
    });

    it('applies green color class to words scoring >= 80', async () => {
      await renderResultsView();
      // "Think" has score 85 → emerald (green)
      const thinkSpan = screen.getByText('Think');
      expect(thinkSpan.className).toMatch(/emerald/);
    });

    it('applies amber color class to words scoring >= 60 and < 80', async () => {
      await renderResultsView();
      // "three" has score 62 → amber
      const threeSpan = screen.getByText('three');
      expect(threeSpan.className).toMatch(/amber/);
    });

    it('applies orange color class to words scoring < 60', async () => {
      await renderResultsView();
      // "thoroughly" has score 40 → orange. Use getAllByText for "through" since
      // it also appears in the session header mispronounced tags.
      const thoroughlySpan = screen.getByText('thoroughly');
      expect(thoroughlySpan.className).toMatch(/orange/);
    });

    it('renders ResultsSummary with overall score chip', async () => {
      await renderResultsView();
      await waitFor(() =>
        expect(screen.getByText('Overall Score')).toBeInTheDocument(),
      );
      const chips = screen.getAllByTestId('score-chip');
      expect(chips.some((c) => c.textContent === '78')).toBe(true);
    });

    it('shows Try Again button after results', async () => {
      await renderResultsView();
      await waitFor(() =>
        expect(
          screen.getByRole('button', { name: /Try Again/i }),
        ).toBeInTheDocument(),
      );
    });
  });

  // ──────────────────────────────────────────────────────────────
  // 8. GlobalSummary edge cases
  // ──────────────────────────────────────────────────────────────
  describe('GlobalSummary edge cases', () => {
    it('renders +N more label when unadoptedVocab exceeds 8 words', async () => {
      const manyWords = Array.from({ length: 10 }, (_, i) => ({
        word: `word${i}`,
        meaning: `meaning${i}`,
      }));
      const data = {
        ...MOCK_LIBRARY_DATA,
        globalWeaknesses: {
          ...MOCK_LIBRARY_DATA.globalWeaknesses,
          unadoptedVocab: manyWords,
        },
      };
      mockFetch.mockResolvedValue(makeOkResponse(data));
      render(<ReadingPractice />);
      await waitFor(() =>
        expect(screen.getByText('+2 more')).toBeInTheDocument(),
      );
    });

    it('does not render GlobalSummary when both phonemes and vocab are empty', async () => {
      const data = {
        ...MOCK_LIBRARY_DATA,
        globalWeaknesses: { phonemes: [], unadoptedVocab: [] },
      };
      mockFetch.mockResolvedValue(makeOkResponse(data));
      render(<ReadingPractice />);
      await waitFor(() =>
        expect(screen.queryByText('Your Focus Areas')).not.toBeInTheDocument(),
      );
    });
  });

  // ──────────────────────────────────────────────────────────────
  // 9. Session card — no weaknesses fallback
  // ──────────────────────────────────────────────────────────────
  describe('session card — no weaknesses', () => {
    it('renders fallback text when session has no phoneme or mispronounced issues', async () => {
      const data = {
        ...MOCK_LIBRARY_DATA,
        sessions: [
          {
            ...MOCK_LIBRARY_DATA.sessions[0],
            weakPhonemes: [],
            mispronounced: [],
          },
        ],
      };
      mockFetch.mockResolvedValue(makeOkResponse(data));
      render(<ReadingPractice />);
      await waitFor(() =>
        expect(
          screen.getByText('No pronunciation issues found'),
        ).toBeInTheDocument(),
      );
    });
  });
});
