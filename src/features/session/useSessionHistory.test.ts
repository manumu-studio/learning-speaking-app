// Tests for useSessionHistory — fetch, grouping by day, loading and errors
/** @vitest-environment jsdom */
import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useSessionHistory } from './useSessionHistory';

function jsonResponse(body: unknown, ok = true, status = 200) {
  return Promise.resolve({
    ok,
    status,
    json: () => Promise.resolve(body),
  }) as Promise<Response>;
}

const sampleSession = {
  id: 'a',
  status: 'DONE',
  intentLabel: null,
  topic: 't',
  durationSecs: 60,
  wordCount: null,
  createdAt: '2026-04-03T12:00:00.000Z',
  overallScore: 7.5,
  pronunciationScore: 8,
  workoutNumber: 1,
};

const sampleApi = {
  sessions: [sampleSession],
  nextCursor: null,
  nextCursorId: null,
  total: 1,
};

describe('useSessionHistory', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('starts loading then populates dayGroups on success', async () => {
    vi.mocked(fetch).mockImplementation((input) => {
      if (String(input).includes('/api/sessions?')) {
        return jsonResponse(sampleApi);
      }
      return jsonResponse({}, false, 404);
    });

    const { result } = renderHook(() => useSessionHistory());

    expect(result.current.isLoading).toBe(true);
    expect(result.current.dayGroups).toEqual([]);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBeNull();
    expect(result.current.total).toBe(1);
    expect(result.current.dayGroups.length).toBeGreaterThan(0);
    expect(result.current.dayGroups[0]?.sessions[0]?.id).toBe('a');
  });

  it('sets error when fetch is not ok', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: false,
      status: 500,
      json: () => Promise.resolve({}),
    } as Response);

    const { result } = renderHook(() => useSessionHistory());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toContain('Failed to load sessions');
    expect(result.current.dayGroups).toEqual([]);
  });

  it('sets error when response body fails validation', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ sessions: 'bad' }),
    } as Response);

    const { result } = renderHook(() => useSessionHistory());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBeTruthy();
  });

  it('groups multiple sessions on the same calendar day into one day group', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      status: 200,
      json: () =>
        Promise.resolve({
          sessions: [
            {
              ...sampleSession,
              id: 'morning',
              createdAt: '2026-04-03T08:00:00.000Z',
            },
            {
              ...sampleSession,
              id: 'evening',
              createdAt: '2026-04-03T18:00:00.000Z',
            },
          ],
          nextCursor: null,
          nextCursorId: null,
          total: 2,
        }),
    } as Response);

    const { result } = renderHook(() => useSessionHistory());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const groups = result.current.dayGroups.filter((g) => g.dateKey === '2026-04-03');
    expect(groups).toHaveLength(1);
    expect(groups[0]?.sessions).toHaveLength(2);
    expect(groups[0]?.sessions[0]?.id).toBe('evening');
    expect(groups[0]?.sessions[1]?.id).toBe('morning');
  });
});
