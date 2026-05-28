// Tests for useSettings — fetch, optimistic updates, rollback, and side effects
/** @vitest-environment jsdom */

import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useSettings } from './useSettings';

// ─── next-themes mock ────────────────────────────────────────────────────────

const mockSetTheme = vi.fn();

vi.mock('next-themes', () => ({
  useTheme: () => ({ setTheme: mockSetTheme }),
}));

// ─── Helpers ─────────────────────────────────────────────────────────────────

function jsonResponse(body: unknown, ok = true, status = 200) {
  return Promise.resolve({
    ok,
    status,
    json: () => Promise.resolve(body),
  }) as Promise<Response>;
}

// ─── Sample data ─────────────────────────────────────────────────────────────

const sampleSettings = {
  id: 's1',
  userId: 'u1',
  dailyGoalMinutes: 10,
  defaultDurationSecs: 120,
  pronunciationEnabled: true,
  theme: 'dark' as const,
  phonemeAlphabet: 'IPA' as const,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
};

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('useSettings', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
    mockSetTheme.mockClear();
    localStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('starts with isLoading=true and settings=null', () => {
    vi.mocked(fetch).mockReturnValue(new Promise(() => undefined));

    const { result } = renderHook(() => useSettings());

    expect(result.current.isLoading).toBe(true);
    expect(result.current.settings).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('fetches settings on mount and populates state', async () => {
    vi.mocked(fetch).mockReturnValue(jsonResponse(sampleSettings));

    const { result } = renderHook(() => useSettings());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.settings).toEqual(sampleSettings);
    expect(result.current.error).toBeNull();
    expect(fetch).toHaveBeenCalledWith('/api/settings');
  });

  it('sets error when GET fetch fails (response not ok)', async () => {
    vi.mocked(fetch).mockReturnValue(
      jsonResponse({ error: 'Unauthorized' }, false, 401),
    );

    const { result } = renderHook(() => useSettings());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.settings).toBeNull();
    expect(result.current.error).toBe('Unauthorized');
  });

  it('sets error when GET response fails Zod validation', async () => {
    vi.mocked(fetch).mockReturnValue(jsonResponse({ invalid: true }));

    const { result } = renderHook(() => useSettings());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.settings).toBeNull();
    expect(result.current.error).toBeTruthy();
  });

  it('updateSetting optimistically updates settings immediately', async () => {
    vi.mocked(fetch)
      .mockReturnValueOnce(jsonResponse(sampleSettings))
      .mockReturnValue(new Promise(() => undefined)); // PATCH never resolves

    const { result } = renderHook(() => useSettings());

    await waitFor(() => {
      expect(result.current.settings).toEqual(sampleSettings);
    });

    act(() => {
      void result.current.updateSetting('dailyGoalMinutes', 20);
    });

    expect(result.current.settings?.dailyGoalMinutes).toBe(20);
  });

  it('updateSetting reverts on PATCH failure', async () => {
    vi.mocked(fetch)
      .mockReturnValueOnce(jsonResponse(sampleSettings))
      .mockReturnValueOnce(jsonResponse({ error: 'Server error' }, false, 500));

    const { result } = renderHook(() => useSettings());

    await waitFor(() => {
      expect(result.current.settings).toEqual(sampleSettings);
    });

    await act(async () => {
      await result.current.updateSetting('dailyGoalMinutes', 99);
    });

    expect(result.current.settings?.dailyGoalMinutes).toBe(
      sampleSettings.dailyGoalMinutes,
    );
    expect(result.current.error).toBe('Server error');
  });

  it('updateSetting calls setTheme when updating theme', async () => {
    const updatedSettings = { ...sampleSettings, theme: 'light' as const };

    vi.mocked(fetch)
      .mockReturnValueOnce(jsonResponse(sampleSettings))
      .mockReturnValueOnce(jsonResponse(updatedSettings));

    const { result } = renderHook(() => useSettings());

    await waitFor(() => {
      expect(result.current.settings).toEqual(sampleSettings);
    });

    await act(async () => {
      await result.current.updateSetting('theme', 'light');
    });

    expect(mockSetTheme).toHaveBeenCalledWith('light');
  });

  it('updateSetting sets localStorage when updating phonemeAlphabet', async () => {
    const updatedSettings = { ...sampleSettings, phonemeAlphabet: 'SAPI' as const };

    vi.mocked(fetch)
      .mockReturnValueOnce(jsonResponse(sampleSettings))
      .mockReturnValueOnce(jsonResponse(updatedSettings));

    const { result } = renderHook(() => useSettings());

    await waitFor(() => {
      expect(result.current.settings).toEqual(sampleSettings);
    });

    await act(async () => {
      await result.current.updateSetting('phonemeAlphabet', 'SAPI');
    });

    expect(localStorage.getItem('lsa-phoneme-alphabet')).toBe('sapi');
  });

  it('updateSetting is a no-op when settings is null', async () => {
    vi.mocked(fetch).mockReturnValue(jsonResponse({ invalid: true }));

    const { result } = renderHook(() => useSettings());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.settings).toBeNull();

    await act(async () => {
      await result.current.updateSetting('dailyGoalMinutes', 20);
    });

    // fetch should only have been called once (the initial GET), not a second time for PATCH
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('updateSetting replaces settings with server response on success', async () => {
    const serverResponse = {
      ...sampleSettings,
      dailyGoalMinutes: 30,
      updatedAt: '2026-06-01T00:00:00Z',
    };

    vi.mocked(fetch)
      .mockReturnValueOnce(jsonResponse(sampleSettings))
      .mockReturnValueOnce(jsonResponse(serverResponse));

    const { result } = renderHook(() => useSettings());

    await waitFor(() => {
      expect(result.current.settings).toEqual(sampleSettings);
    });

    await act(async () => {
      await result.current.updateSetting('dailyGoalMinutes', 30);
    });

    expect(result.current.settings).toEqual(serverResponse);
    expect(result.current.settings?.updatedAt).toBe('2026-06-01T00:00:00Z');
  });
});
