// Test the subtle daily summary card
/** @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { DailySummaryCard } from './DailySummaryCard';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function jsonResponse(body: unknown, ok = true, status = 200) {
  return Promise.resolve({
    ok,
    status,
    json: () => Promise.resolve(body),
  }) as Promise<Response>;
}

const mockResponse = {
  date: '2026-06-01',
  overallScore: 7.2,
  totalDurationSecs: 720,
  topicSentence: 'We worked through idioms and daily routines.',
  sessionCount: 3,
  conclusionData: {
    activeTargetsTomorrow: ['bear in mind', 'albeit', 'look into', 'depend on'],
  },
};

// ─── Setup ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.restoreAllMocks();
});

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('DailySummaryCard', () => {
  it('shows loading skeleton initially', () => {
    vi.stubGlobal('fetch', vi.fn(() => new Promise(() => undefined)));

    render(<DailySummaryCard dateKey="2026-06-01" />);

    const skeleton = document.querySelector('.animate-pulse');
    expect(skeleton).not.toBeNull();
  });

  it('renders overall score after loading', async () => {
    vi.stubGlobal('fetch', vi.fn(() => jsonResponse(mockResponse)));

    render(<DailySummaryCard dateKey="2026-06-01" />);

    await waitFor(() => {
      expect(screen.getByText('7.2')).toBeInTheDocument();
    });

    expect(screen.getByText('Overall')).toBeInTheDocument();
  });

  it('renders topic sentence', async () => {
    vi.stubGlobal('fetch', vi.fn(() => jsonResponse(mockResponse)));

    render(<DailySummaryCard dateKey="2026-06-01" />);

    await waitFor(() => {
      expect(
        screen.getByText('We worked through idioms and daily routines.'),
      ).toBeInTheDocument();
    });
  });

  it('renders formatted duration', async () => {
    vi.stubGlobal('fetch', vi.fn(() => jsonResponse(mockResponse)));

    render(<DailySummaryCard dateKey="2026-06-01" />);

    await waitFor(() => {
      expect(screen.getByText(/12 min/)).toBeInTheDocument();
    });
  });

  it('renders 4 "use tomorrow" pills', async () => {
    vi.stubGlobal('fetch', vi.fn(() => jsonResponse(mockResponse)));

    render(<DailySummaryCard dateKey="2026-06-01" />);

    await waitFor(() => {
      expect(screen.getByText('bear in mind')).toBeInTheDocument();
    });

    expect(screen.getByText('albeit')).toBeInTheDocument();
    expect(screen.getByText('look into')).toBeInTheDocument();
    expect(screen.getByText('depend on')).toBeInTheDocument();
    expect(screen.getByText('Use tomorrow')).toBeInTheDocument();
  });

  it('returns null when fetch returns 404', async () => {
    vi.stubGlobal('fetch', vi.fn(() => jsonResponse({}, false, 404)));

    const { container } = render(<DailySummaryCard dateKey="2026-06-01" />);

    await waitFor(() => {
      expect(container.firstChild).toBeNull();
    });
  });

  it('calls onTapDay with dateKey when card is clicked', async () => {
    vi.stubGlobal('fetch', vi.fn(() => jsonResponse(mockResponse)));
    const onTapDay = vi.fn();

    render(<DailySummaryCard dateKey="2026-06-01" onTapDay={onTapDay} />);

    await waitFor(() => {
      expect(screen.getByText('7.2')).toBeInTheDocument();
    });

    const card = screen.getByRole('button');
    fireEvent.click(card);

    expect(onTapDay).toHaveBeenCalledWith('2026-06-01');
  });

  it('renders formatted date label', async () => {
    vi.stubGlobal('fetch', vi.fn(() => jsonResponse(mockResponse)));

    render(<DailySummaryCard dateKey="2026-06-01" />);

    await waitFor(() => {
      expect(screen.getByText(/JUN 1/)).toBeInTheDocument();
    });
  });
});
