// Component and hook tests for DailySummaryCard — skeleton, pillar chips, new words, feedback, and error states
/** @vitest-environment jsdom */
import { render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DailySummaryCard } from './DailySummaryCard';

// ─── Helpers ────────────────────────────────────────────────────────────────

function jsonResponse(body: unknown, ok = true, status = 200) {
  return Promise.resolve({
    ok,
    status,
    json: () => Promise.resolve(body),
  }) as Promise<Response>;
}

const validSummary = {
  date: '2026-06-01',
  deliveryAvg: 7.5,
  languageAvg: 6.8,
  pronunciationAvg: 8.2,
  newWords: ['articulate', 'succinct'],
  feedback: 'Great session — your delivery was on point today.',
  sessionCount: 2,
};

// ─── Setup / teardown ───────────────────────────────────────────────────────

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn());
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('DailySummaryCard', () => {
  it('shows skeleton loading state initially', () => {
    // Fetch never resolves — card stays in loading state
    vi.mocked(fetch).mockImplementation(() => new Promise(() => undefined));

    render(<DailySummaryCard dateKey="2026-06-01" />);

    // Skeleton uses animate-pulse; verify the container is present and content isn't loaded yet
    const container = document.querySelector('.animate-pulse');
    expect(container).not.toBeNull();
    expect(screen.queryByText('Delivery')).toBeNull();
  });

  it('renders pillar score chips with correct values after loading', async () => {
    vi.mocked(fetch).mockReturnValue(jsonResponse(validSummary));

    render(<DailySummaryCard dateKey="2026-06-01" />);

    await waitFor(() => {
      expect(screen.getByText('Delivery')).toBeInTheDocument();
    });

    expect(screen.getByText('Language')).toBeInTheDocument();
    expect(screen.getByText('Pronunciation')).toBeInTheDocument();

    // Score values rendered as .toFixed(1)
    expect(screen.getByText('7.5')).toBeInTheDocument();
    expect(screen.getByText('6.8')).toBeInTheDocument();
    expect(screen.getByText('8.2')).toBeInTheDocument();
  });

  it('renders new words when present', async () => {
    vi.mocked(fetch).mockReturnValue(jsonResponse(validSummary));

    render(<DailySummaryCard dateKey="2026-06-01" />);

    await waitFor(() => {
      expect(screen.getByText('New words:')).toBeInTheDocument();
    });

    expect(screen.getByText(/articulate, succinct/)).toBeInTheDocument();
  });

  it('hides new words line when array is empty', async () => {
    vi.mocked(fetch).mockReturnValue(
      jsonResponse({ ...validSummary, newWords: [] }),
    );

    render(<DailySummaryCard dateKey="2026-06-01" />);

    await waitFor(() => {
      expect(screen.getByText('Delivery')).toBeInTheDocument();
    });

    expect(screen.queryByText('New words:')).toBeNull();
  });

  it('renders feedback text in italic', async () => {
    vi.mocked(fetch).mockReturnValue(jsonResponse(validSummary));

    render(<DailySummaryCard dateKey="2026-06-01" />);

    await waitFor(() => {
      expect(screen.getByText(validSummary.feedback)).toBeInTheDocument();
    });

    const feedbackEl = screen.getByText(validSummary.feedback);
    expect(feedbackEl.tagName).toBe('P');
    expect(feedbackEl.className).toContain('italic');
  });

  it('returns null on fetch error (fails silently)', async () => {
    vi.mocked(fetch).mockReturnValue(jsonResponse({}, false, 500));

    const { container } = render(<DailySummaryCard dateKey="2026-06-01" />);

    await waitFor(() => {
      // After the failed fetch the component returns null — container is empty
      expect(container.firstChild).toBeNull();
    });
  });

  it('returns null when API returns 404', async () => {
    vi.mocked(fetch).mockReturnValue(jsonResponse({ code: 'NO_SESSIONS' }, false, 404));

    const { container } = render(<DailySummaryCard dateKey="2026-06-01" />);

    await waitFor(() => {
      expect(container.firstChild).toBeNull();
    });
  });

  it('fetches from correct URL with dateKey', async () => {
    vi.mocked(fetch).mockReturnValue(jsonResponse(validSummary));

    render(<DailySummaryCard dateKey="2026-05-15" />);

    await waitFor(() => {
      expect(screen.getByText('Delivery')).toBeInTheDocument();
    });

    expect(fetch).toHaveBeenCalledWith('/api/users/me/daily-summaries?date=2026-05-15');
  });

  it('returns null when API response fails Zod schema validation', async () => {
    // Missing required fields — schema parse will throw
    vi.mocked(fetch).mockReturnValue(
      jsonResponse({ date: '2026-06-01', broken: true }),
    );

    const { container } = render(<DailySummaryCard dateKey="2026-06-01" />);

    await waitFor(() => {
      expect(container.firstChild).toBeNull();
    });
  });
});
