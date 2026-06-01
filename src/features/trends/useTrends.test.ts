// Tests for useTrends — fetch, range changes, state transitions, and error handling
/** @vitest-environment jsdom */

import { renderHook, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useTrends } from './useTrends';

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------

vi.mock('@/features/dashboard/pillars', () => ({
  PILLAR_CONFIG: {
    delivery: {
      label: 'Delivery',
      color: '#3b82f6',
      metricKeys: ['fillerUsage', 'speakingRate'],
    },
    language: {
      label: 'Language',
      color: '#8b5cf6',
      metricKeys: [
        'connectorRepetition',
        'structuralVariety',
        'vocabularyPrecision',
        'verbAccuracy',
        'argumentClosure',
      ],
    },
    pronunciation: {
      label: 'Pronunciation',
      color: '#10b981',
      metricKeys: ['pronunciationAccuracy', 'prosodyScore'],
    },
  },
}));

vi.mock('@/components/ui/TrendChart', () => ({}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function jsonResponse(body: unknown, ok = true, status = 200) {
  return Promise.resolve({
    ok,
    status,
    json: () => Promise.resolve(body),
  }) as Promise<Response>;
}

// All 9 metric keys required — TrendsResponseSchema uses z.record(MetricKeySchema) which
// treats the enum as exhaustive and rejects missing keys.
const allScores = {
  fillerUsage: 7.5,
  speakingRate: 6.0,
  connectorRepetition: 7.0,
  structuralVariety: 6.5,
  vocabularyPrecision: 8.0,
  verbAccuracy: 7.0,
  argumentClosure: 6.0,
  lexicalSophistication: 6.0,
  pronunciationAccuracy: 8.5,
  prosodyScore: 7.5,
};

const allScores2 = {
  fillerUsage: 8.0,
  speakingRate: 6.5,
  connectorRepetition: 7.5,
  structuralVariety: 7.0,
  vocabularyPrecision: 8.5,
  verbAccuracy: 7.5,
  argumentClosure: 6.5,
  lexicalSophistication: 6.5,
  pronunciationAccuracy: 9.0,
  prosodyScore: 8.0,
};

const sampleResponse = {
  range: '30d',
  dataPoints: [
    { date: '2026-05-01', scores: allScores },
    { date: '2026-05-02', scores: allScores2 },
  ],
  pillarTrends: [
    {
      pillarKey: 'delivery',
      label: 'Delivery',
      color: '#3b82f6',
      dataPoints: [
        { date: '2026-05-01', averageScore: 6.8 },
        { date: '2026-05-02', averageScore: 7.3 },
      ],
      deltaPercent: 7.4,
    },
    {
      pillarKey: 'language',
      label: 'Language',
      color: '#8b5cf6',
      dataPoints: [],
      deltaPercent: null,
    },
    {
      pillarKey: 'pronunciation',
      label: 'Pronunciation',
      color: '#10b981',
      dataPoints: [],
      deltaPercent: null,
    },
  ],
  sessionCount: 2,
};

// ---------------------------------------------------------------------------
// Setup / teardown
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn());
});

afterEach(() => {
  vi.unstubAllGlobals();
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('useTrends', () => {
  it('initial range is "30d" and status is idle or loading', () => {
    vi.mocked(fetch).mockReturnValue(new Promise(() => undefined));

    const { result } = renderHook(() => useTrends());

    expect(result.current.range).toBe('30d');
    expect(['idle', 'loading']).toContain(result.current.state.status);
  });

  it('fetches trends on mount and sets status to success', async () => {
    vi.mocked(fetch).mockReturnValue(jsonResponse(sampleResponse));

    const { result } = renderHook(() => useTrends());

    await waitFor(() => {
      expect(result.current.state.status).toBe('success');
    });

    expect(fetch).toHaveBeenCalledWith(
      '/api/metrics/trends?range=30d',
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
  });

  it('sets error state when fetch response is not ok', async () => {
    vi.mocked(fetch).mockReturnValue(
      jsonResponse({ error: 'Unauthorized' }, false, 401),
    );

    const { result } = renderHook(() => useTrends());

    await waitFor(() => {
      expect(result.current.state.status).toBe('error');
    });

    if (result.current.state.status === 'error') {
      expect(result.current.state.message).toBe('Unauthorized');
    }
  });

  it('sets error state when Zod parsing fails on malformed response', async () => {
    vi.mocked(fetch).mockReturnValue(
      jsonResponse({ totally: 'wrong', shape: true }),
    );

    const { result } = renderHook(() => useTrends());

    await waitFor(() => {
      expect(result.current.state.status).toBe('error');
    });
  });

  it('range defaults to "30d"', () => {
    vi.mocked(fetch).mockReturnValue(new Promise(() => undefined));

    const { result } = renderHook(() => useTrends());

    expect(result.current.range).toBe('30d');
  });

  it('state has status="success" with pillarSeries array after successful fetch', async () => {
    vi.mocked(fetch).mockReturnValue(jsonResponse(sampleResponse));

    const { result } = renderHook(() => useTrends());

    await waitFor(() => {
      expect(result.current.state.status).toBe('success');
    });

    if (result.current.state.status === 'success') {
      expect(Array.isArray(result.current.state.pillarSeries)).toBe(true);
      expect(result.current.state.pillarSeries).toHaveLength(3);
    }
  });

  it('pillarSeries items have correct pillarKey, label, color, series, deltaPercent, and metricSeries', async () => {
    vi.mocked(fetch).mockReturnValue(jsonResponse(sampleResponse));

    const { result } = renderHook(() => useTrends());

    await waitFor(() => {
      expect(result.current.state.status).toBe('success');
    });

    if (result.current.state.status !== 'success') return;

    const { pillarSeries } = result.current.state;
    const delivery = pillarSeries.find((p) => p.pillarKey === 'delivery');

    expect(delivery).toBeDefined();
    expect(delivery?.label).toBe('Delivery');
    expect(delivery?.color).toBe('#3b82f6');
    expect(delivery?.deltaPercent).toBe(7.4);

    // Pillar-level series derived from pillarTrend.dataPoints
    expect(delivery?.series).toEqual([
      { date: '2026-05-01', value: 6.8 },
      { date: '2026-05-02', value: 7.3 },
    ]);

    // Per-metric series derived from raw dataPoints
    expect(Array.isArray(delivery?.metricSeries)).toBe(true);
    const fillerSeries = delivery?.metricSeries.find(
      (m) => m.metricKey === 'fillerUsage',
    );
    expect(fillerSeries?.label).toBe('Filler Words');
    expect(fillerSeries?.series).toEqual([
      { date: '2026-05-01', value: 7.5 },
      { date: '2026-05-02', value: 8.0 },
    ]);

    // Language pillar has null deltaPercent and empty series
    const language = pillarSeries.find((p) => p.pillarKey === 'language');
    expect(language?.deltaPercent).toBeNull();
    expect(language?.series).toHaveLength(0);
  });

  it('handles network error gracefully (fetch throws)', async () => {
    vi.mocked(fetch).mockRejectedValue(new Error('Network failure'));

    const { result } = renderHook(() => useTrends());

    await waitFor(() => {
      expect(result.current.state.status).toBe('error');
    });

    if (result.current.state.status === 'error') {
      expect(result.current.state.message).toBe('Network failure');
    }
  });

  it('re-fetches when range changes and reflects new results', async () => {
    vi.mocked(fetch)
      .mockReturnValueOnce(jsonResponse(sampleResponse))
      .mockReturnValueOnce(
        jsonResponse({ ...sampleResponse, range: '7d' as const, sessionCount: 1 }),
      );

    const { result } = renderHook(() => useTrends());

    await waitFor(() => {
      expect(result.current.state.status).toBe('success');
    });

    act(() => {
      result.current.setRange('7d');
    });

    await waitFor(() => {
      expect(result.current.state.status).toBe('success');
    });

    expect(fetch).toHaveBeenCalledTimes(2);
    expect(fetch).toHaveBeenNthCalledWith(
      2,
      '/api/metrics/trends?range=7d',
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
  });
});
