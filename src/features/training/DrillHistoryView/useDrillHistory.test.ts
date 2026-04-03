// Tests for useDrillHistory — fetch drills, stats, errors, refetch
/** @vitest-environment jsdom */
import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useDrillHistory } from './useDrillHistory';

function jsonResponse(body: unknown, ok = true, status = 200) {
  return Promise.resolve({
    ok,
    status,
    json: () => Promise.resolve(body),
  }) as Promise<Response>;
}

const validPayload = {
  drills: [
    {
      id: 'd1',
      drillType: 'rephrase',
      metricKey: 'k',
      metricLabel: 'L',
      improved: true,
      completedAt: '2026-04-01T00:00:00.000Z',
      createdAt: '2026-04-01T00:00:00.000Z',
    },
  ],
  stats: {
    totalCompleted: 3,
    weeklyCompleted: 1,
    improvementRate: 40,
  },
};

describe('useDrillHistory', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('loads drills and stats on mount', async () => {
    vi.mocked(fetch).mockImplementation((input) => {
      if (String(input).includes('/api/drills')) {
        return jsonResponse(validPayload);
      }
      return jsonResponse({}, false, 404);
    });

    const { result } = renderHook(() => useDrillHistory());

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBeNull();
    expect(result.current.drills).toHaveLength(1);
    expect(result.current.stats.totalCompleted).toBe(3);
  });

  it('sets error when API returns non-ok', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: false,
      status: 500,
      json: () => Promise.resolve({}),
    } as Response);

    const { result } = renderHook(() => useDrillHistory());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBe('Failed to load drill history');
  });

  it('sets error when response JSON is invalid', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ drills: [] }),
    } as Response);

    const { result } = renderHook(() => useDrillHistory());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBe('Invalid response');
  });

  it('refetch loads data again', async () => {
    let n = 0;
    vi.mocked(fetch).mockImplementation((input) => {
      if (!String(input).includes('/api/drills')) {
        return jsonResponse({}, false, 404);
      }
      n += 1;
      return jsonResponse({
        ...validPayload,
        stats: { ...validPayload.stats, totalCompleted: n },
      });
    });

    const { result } = renderHook(() => useDrillHistory());

    await waitFor(() => {
      expect(result.current.stats.totalCompleted).toBe(1);
    });

    await act(async () => {
      await result.current.refetch();
    });

    await waitFor(() => {
      expect(result.current.stats.totalCompleted).toBe(2);
    });
  });
});
