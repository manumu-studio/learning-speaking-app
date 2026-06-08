// Tests for useSessionStatus — fetch session detail, errors, retry
/** @vitest-environment jsdom */
import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useSessionStatus } from './useSessionStatus';

function jsonResponse(body: unknown, ok = true, status = 200) {
  return Promise.resolve({
    ok,
    status,
    json: () => Promise.resolve(body),
  }) as Promise<Response>;
}

const doneSession = {
  id: 'sess-1',
  status: 'DONE',
  durationSecs: 10,
  topic: null,
  focusNext: null,
  summary: null,
  errorMessage: null,
  focusMetricKey: null,
  createdAt: '2026-04-03T00:00:00.000Z',
  insights: [],
};

describe('useSessionStatus', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('loads session and clears loading when fetch succeeds', async () => {
    vi.mocked(fetch).mockImplementation((input) => {
      if (String(input).includes('/api/sessions/sess-1')) {
        return jsonResponse(doneSession);
      }
      return jsonResponse({}, false, 404);
    });

    const { result } = renderHook(() => useSessionStatus('sess-1'));

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBeNull();
    expect(result.current.session?.id).toBe('sess-1');
    expect(result.current.isDone).toBe(true);
    expect(result.current.isProcessing).toBe(false);
  });

  it('sets error when fetch returns non-ok', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: false,
      status: 404,
      json: () => Promise.resolve({}),
    } as Response);

    const { result } = renderHook(() => useSessionStatus('missing'));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBe('Failed to fetch session');
    expect(result.current.session).toBeNull();
  });

  it('sets error when JSON fails schema validation', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ id: 'x' }),
    } as Response);

    const { result } = renderHook(() => useSessionStatus('sess-1'));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBeTruthy();
  });

  it('retry sets loading and refetches session', async () => {
    let calls = 0;
    vi.mocked(fetch).mockImplementation((input) => {
      if (!String(input).includes('/api/sessions/sess-1')) {
        return jsonResponse({}, false, 404);
      }
      calls += 1;
      if (calls === 1) {
        return jsonResponse({}, false, 500);
      }
      return jsonResponse(doneSession);
    });

    const { result } = renderHook(() => useSessionStatus('sess-1'));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    expect(result.current.error).toBeTruthy();

    await act(async () => {
      result.current.retry();
    });

    await waitFor(() => {
      expect(result.current.session?.status).toBe('DONE');
    });

    expect(result.current.error).toBeNull();
    expect(calls).toBeGreaterThanOrEqual(2);
  });

  it('parses verbatim fields when present', async () => {
    const sessionWithVerbatim = {
      ...doneSession,
      verbatimTranscript: 'um so like I think',
      verbatimWordCount: 6,
      divergenceSpans: [
        { start: 0, end: 2, verbatimText: 'um so', normalizedText: 'So', type: 'insertion', confidence: 0.95 },
      ],
      verbatimProvider: 'assemblyai',
    };

    vi.mocked(fetch).mockImplementation((input) => {
      if (String(input).includes('/api/sessions/')) return jsonResponse(sessionWithVerbatim);
      return jsonResponse({}, false, 404);
    });

    const { result } = renderHook(() => useSessionStatus('sess-v'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.session?.verbatimTranscript).toBe('um so like I think');
    expect(result.current.session?.verbatimWordCount).toBe(6);
    expect(result.current.session?.divergenceSpans).toHaveLength(1);
    expect(result.current.session?.divergenceSpans?.[0]?.type).toBe('insertion');
    expect(result.current.session?.verbatimProvider).toBe('assemblyai');
  });

  it('omits verbatim fields when not present', async () => {
    vi.mocked(fetch).mockImplementation((input) => {
      if (String(input).includes('/api/sessions/')) return jsonResponse(doneSession);
      return jsonResponse({}, false, 404);
    });

    const { result } = renderHook(() => useSessionStatus('sess-1'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.session?.verbatimTranscript).toBeUndefined();
    expect(result.current.session?.verbatimWordCount).toBeUndefined();
    expect(result.current.session?.divergenceSpans).toBeUndefined();
    expect(result.current.session?.verbatimProvider).toBeUndefined();
  });

  it('reports processing when status is in pipeline', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      status: 200,
      json: () =>
        Promise.resolve({
          ...doneSession,
          status: 'TRANSCRIBING',
        }),
    } as Response);

    const { result } = renderHook(() => useSessionStatus('sess-1'));

    await waitFor(() => {
      expect(result.current.isProcessing).toBe(true);
    });

    expect(result.current.isDone).toBe(false);
  });
});
