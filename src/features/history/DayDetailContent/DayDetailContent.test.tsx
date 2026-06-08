// Tests for the day-detail five-section meta-session view
import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { DayDetailContent } from './DayDetailContent';

vi.mock('next/link', () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

function jsonResponse(body: unknown): Promise<Response> {
  return Promise.resolve({
    ok: true,
    status: 200,
    json: () => Promise.resolve(body),
  } as Response);
}

const dayDetail = {
  hero: {
    date: '2026-06-01',
    overallScore: 7.2,
    sessionCount: 1,
    totalDurationSecs: 600,
    totalWords: 120,
    focusAreas: ['verbAccuracy'],
    topicSentence: 'We practiced negotiation skills.',
    pillarScores: { delivery: 7, language: 8, pronunciation: 6 },
  },
  sessions: [{
    id: 's1',
    href: '/session/s1',
    sessionNumber: 1,
    timeLabel: '9:00 AM',
    topic: 'Negotiation',
    durationSecs: 600,
    wordCount: 120,
    pronunciationMetric: null,
    speechMetric: { label: 'Grammar', value: '7/10', tone: 'neutral' },
  }],
  speechQuality: {
    categories: [{
      key: 'grammar',
      label: 'Grammar',
      score: 7,
      summary: 'Grammar averaged 7.0/10 today.',
      metrics: [],
      items: [],
      emptyState: null,
    }],
    sourceAvailability: { pronunciation: true, naturalness: false, corpus: false, verbatim: false, grammar: true, languageBank: false },
  },
  pronunciation: {
    categories: [{
      key: 'scoreSummary',
      label: 'Score Summary',
      score: 82,
      summary: 'Pronunciation averaged 82.0% today.',
      metrics: [],
      items: [],
      emptyState: null,
    }],
    sourceAvailability: { pronunciation: true, naturalness: false, corpus: false, verbatim: false, grammar: true, languageBank: false },
  },
  generalFeedback: {
    summary: 'Solid day.',
    suggestionWords: [],
    wordBank: [],
    activeTargets: [{ text: 'depend on', reason: 'Tomorrow target.' }],
    emptyState: null,
  },
  transcript: {
    sessions: [{
      sessionId: 's1',
      title: 'Session 1',
      topic: 'Negotiation',
      modes: [{
        kind: 'yourWords',
        label: 'Your words',
        text: 'Hello world.',
        tokens: [
          { text: 'Hello', kind: 'word', pronunciation: null },
          { text: ' ', kind: 'space', pronunciation: null },
          { text: 'world', kind: 'word', pronunciation: null },
          { text: '.', kind: 'punctuation', pronunciation: null },
        ],
        wordCount: 2,
      }],
    }],
    emptyState: null,
  },
};

beforeEach(() => {
  vi.restoreAllMocks();
});

describe('DayDetailContent', () => {
  it('renders four top-level sections (no top-level Transcript)', async () => {
    vi.stubGlobal('fetch', vi.fn(() => jsonResponse({ date: '2026-06-01', isClosed: true, dayDetail })));

    render(<DayDetailContent date="2026-06-01" />);

    await waitFor(() => {
      expect(screen.getByText('We practiced negotiation skills.')).toBeInTheDocument();
    });

    expect(screen.getByRole('button', { name: /Sessions/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Speech Quality/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Pronunciation & Intonation/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /General Feedback/i })).toBeInTheDocument();
  });

  it('renders score badge on pronunciation category', async () => {
    vi.stubGlobal('fetch', vi.fn(() => jsonResponse({ date: '2026-06-01', isClosed: true, dayDetail })));

    render(<DayDetailContent date="2026-06-01" />);

    await waitFor(() => {
      expect(screen.getByText('We practiced negotiation skills.')).toBeInTheDocument();
    });

    expect(screen.getByText('82.0')).toBeInTheDocument();
  });

  it('renders View evidence link', async () => {
    vi.stubGlobal('fetch', vi.fn(() => jsonResponse({ date: '2026-06-01', isClosed: true, dayDetail })));

    render(<DayDetailContent date="2026-06-01" />);

    await waitFor(() => {
      expect(screen.getByText('We practiced negotiation skills.')).toBeInTheDocument();
    });

    const link = screen.getByText('View evidence →');
    expect(link).toBeInTheDocument();
    expect(link.closest('a')).toHaveAttribute('href', '/logs/day/2026-06-01');
  });
});
