// Test the language bank panel data-fetching hook
/** @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useLanguageBankPanel } from './useLanguageBankPanel';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function jsonResponse(body: unknown, ok = true, status = 200) {
  return Promise.resolve({
    ok,
    status,
    json: () => Promise.resolve(body),
  }) as Promise<Response>;
}

const item = {
  id: 'lb_1',
  userId: 'user_1',
  text: 'bear in mind',
  lemmaOrPattern: 'bear in mind',
  category: 'collocation',
  source: 'naturalness',
  usageCount: 2,
  masteryState: 'developing',
  isActiveTarget: true,
  firstSuggestedAt: '2026-06-01T00:00:00.000Z',
  lastUsedAt: null,
  lastSuggestedAt: null,
  nextRetargetAt: null,
};

// ─── Setup ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.restoreAllMocks();
});

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('useLanguageBankPanel', () => {
  it('starts in a loading state', () => {
    vi.stubGlobal('fetch', vi.fn(() => new Promise(() => undefined)));

    const { result } = renderHook(() => useLanguageBankPanel());

    expect(result.current.isLoading).toBe(true);
    expect(result.current.items).toEqual([]);
    expect(result.current.activeTargets).toEqual([]);
    expect(result.current.error).toBeNull();
  });

  it('populates items and active targets on a successful response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => jsonResponse({ items: [item], activeTargets: [item] })),
    );

    const { result } = renderHook(() => useLanguageBankPanel());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.items).toHaveLength(1);
    expect(result.current.items[0]?.text).toBe('bear in mind');
    expect(result.current.activeTargets).toHaveLength(1);
    expect(result.current.error).toBeNull();
  });

  it('sets an error when the response is not ok', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => jsonResponse({}, false, 500)),
    );

    const { result } = renderHook(() => useLanguageBankPanel());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.error).toBe('Failed to load language bank (500)');
    expect(result.current.items).toEqual([]);
  });

  it('sets an error when the fetch rejects', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.reject(new Error('network down'))),
    );

    const { result } = renderHook(() => useLanguageBankPanel());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.error).toBe('network down');
  });

  it('sets an error when the payload fails schema validation', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => jsonResponse({ items: 'not-an-array' })),
    );

    const { result } = renderHook(() => useLanguageBankPanel());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.error).not.toBeNull();
    expect(result.current.items).toEqual([]);
  });
});
