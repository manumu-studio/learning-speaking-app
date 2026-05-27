// Tests for useDrill — drill fetch, recording flow, completion, retry, and errors
/** @vitest-environment jsdom */
import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useDrill } from './useDrill';

const baseDrillJson = {
  id: 'drill-1',
  sessionId: 'session-1',
  drillType: 'rephrase',
  prompt: 'Improve this sentence',
  sourceExample: null,
  metricKey: 'connectorRepetition',
};

function jsonResponse(body: unknown, ok = true, status = 200) {
  return Promise.resolve({
    ok,
    status,
    json: () => Promise.resolve(body),
  }) as Promise<Response>;
}

describe('useDrill', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('starts loading then exposes drill on successful fetch', async () => {
    vi.mocked(fetch).mockImplementation((input) => {
      const url = String(input);
      if (url.includes('/api/drills/drill-1') && !url.includes('/complete')) {
        return jsonResponse({ ...baseDrillJson, completedAt: null });
      }
      return jsonResponse({}, false, 404);
    });

    const { result } = renderHook(() => useDrill('drill-1'));

    expect(result.current.isLoading).toBe(true);
    expect(result.current.drill).toBeNull();

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBeNull();
    expect(result.current.drill).not.toBeNull();
    expect(result.current.drill?.prompt).toBe('Improve this sentence');
    expect(result.current.state).toBe('prompt');
    expect(result.current.feedback).toBeNull();
  });

  it('sets feedback state when drill is already completed', async () => {
    vi.mocked(fetch).mockImplementation((input) => {
      const url = String(input);
      if (url.includes('/api/drills/done') && !url.includes('/complete')) {
        return jsonResponse({
          ...baseDrillJson,
          id: 'done',
          completedAt: '2024-01-01T00:00:00.000Z',
          feedback: 'Nice work',
          improved: true,
        });
      }
      return jsonResponse({}, false, 404);
    });

    const { result } = renderHook(() => useDrill('done'));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.state).toBe('feedback');
    expect(result.current.feedback).toEqual({ feedback: 'Nice work', improved: true });
  });

  it('records error on failed drill fetch', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: false,
      status: 500,
      json: () => Promise.resolve({}),
    } as Response);

    const { result } = renderHook(() => useDrill('drill-1'));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBe('Failed to load drill');
    expect(result.current.drill).toBeNull();
  });

  it('records error on invalid drill response shape', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ invalid: true }),
    } as Response);

    const { result } = renderHook(() => useDrill('drill-1'));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBe('Invalid drill response');
  });

  it('transitions prompt → recording → processing → feedback on successful submit', async () => {
    vi.mocked(fetch).mockImplementation((input, init) => {
      const url = String(input);
      if (url.includes('/api/drills/drill-1') && !url.includes('/complete')) {
        return jsonResponse({ ...baseDrillJson, completedAt: null });
      }
      if (url.includes('/complete') && init?.method === 'POST') {
        return jsonResponse({ feedback: 'Good', improved: false });
      }
      return jsonResponse({}, false, 404);
    });

    const { result } = renderHook(() => useDrill('drill-1'));

    await waitFor(() => {
      expect(result.current.drill).not.toBeNull();
    });

    act(() => {
      result.current.startRecording();
    });
    expect(result.current.state).toBe('recording');

    const blob = new Blob(['audio'], { type: 'audio/webm' });
    await act(async () => {
      await result.current.stopRecording(blob);
    });

    await waitFor(() => {
      expect(result.current.state).toBe('feedback');
    });

    expect(result.current.feedback).toEqual({ feedback: 'Good', improved: false });
    expect(result.current.error).toBeNull();
  });

  it('returns to prompt and sets error when complete request fails', async () => {
    vi.mocked(fetch).mockImplementation((input, init) => {
      const url = String(input);
      if (url.includes('/api/drills/drill-1') && !url.includes('/complete')) {
        return jsonResponse({ ...baseDrillJson, completedAt: null });
      }
      if (url.includes('/complete') && init?.method === 'POST') {
        return jsonResponse({}, false, 500);
      }
      return jsonResponse({}, false, 404);
    });

    const { result } = renderHook(() => useDrill('drill-1'));

    await waitFor(() => {
      expect(result.current.drill).not.toBeNull();
    });

    act(() => {
      result.current.startRecording();
    });

    const blob = new Blob([], { type: 'audio/webm' });
    await act(async () => {
      await result.current.stopRecording(blob);
    });

    await waitFor(() => {
      expect(result.current.state).toBe('prompt');
    });

    expect(result.current.error).toBe('Failed to submit drill');
  });

  it('tryAgain returns null and sets error when drill has no sessionId', async () => {
    vi.mocked(fetch).mockImplementation((input) => {
      const url = String(input);
      if (url.includes('/api/drills/standalone') && !url.includes('/complete')) {
        return jsonResponse({
          ...baseDrillJson,
          id: 'standalone',
          sessionId: null,
          completedAt: null,
        });
      }
      return jsonResponse({}, false, 404);
    });

    const { result } = renderHook(() => useDrill('standalone'));

    await waitFor(() => {
      expect(result.current.drill).not.toBeNull();
    });

    let nextId: string | null = 'unset';
    await act(async () => {
      nextId = await result.current.tryAgain();
    });

    expect(nextId).toBeNull();
    expect(result.current.error).toContain('workout results');
  });

  it('tryAgain fetches session and returns new drill id on success', async () => {
    const newDrill = { ...baseDrillJson, id: 'drill-2', completedAt: null };

    vi.mocked(fetch).mockImplementation((input, init) => {
      const url = String(input);
      if (url.includes('/api/drills/drill-1') && !url.includes('/complete')) {
        return jsonResponse({ ...baseDrillJson, completedAt: null });
      }
      if (url.includes('/api/sessions/session-1')) {
        return jsonResponse({
          focusNext: 'clarity',
          intentLabel: 'practice',
          transcript: { text: 'Hello world' },
          insights: [{ pattern: 'p1', examples: ['a', 'b'] }],
        });
      }
      if (init?.method === 'POST' && url.includes('/api/drills') && !url.includes('complete')) {
        return jsonResponse(newDrill);
      }
      return jsonResponse({}, false, 404);
    });

    const { result } = renderHook(() => useDrill('drill-1'));

    await waitFor(() => {
      expect(result.current.drill).not.toBeNull();
    });

    let nextId: string | null = null;
    await act(async () => {
      nextId = await result.current.tryAgain();
    });

    expect(nextId).toBe('drill-2');
    expect(result.current.error).toBeNull();
  });

  it('unmounts without throwing after async fetch resolves', async () => {
    vi.mocked(fetch).mockImplementation((input) => {
      const url = String(input);
      if (url.includes('/api/drills/drill-1')) {
        return jsonResponse({ ...baseDrillJson, completedAt: null });
      }
      return jsonResponse({}, false, 404);
    });

    const { result, unmount } = renderHook(() => useDrill('drill-1'));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(() => {
      unmount();
    }).not.toThrow();
  });
});
