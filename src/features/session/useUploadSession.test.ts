// Tests for useUploadSession — upload flow, loading flag, server errors
/** @vitest-environment jsdom */
import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useUploadSession } from './useUploadSession';

function jsonResponse(body: unknown, ok = true, status = 200): Response {
  return {
    ok,
    status,
    json: () => Promise.resolve(body),
  } as Response;
}

describe('useUploadSession', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('returns session id on successful upload', async () => {
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse({
        id: 'new-session',
        status: 'UPLOADED',
        createdAt: '2026-04-03T00:00:00.000Z',
        estimatedWaitSecs: 30,
      }),
    );

    const { result } = renderHook(() => useUploadSession());

    let id = '';
    await act(async () => {
      id = await result.current.upload(new Blob(['a'], { type: 'audio/webm' }), 12, 'My topic');
    });

    expect(id).toBe('new-session');
    expect(result.current.error).toBeNull();
    expect(result.current.isUploading).toBe(false);
  });

  it('sets isUploading true during request then false after', async () => {
    let resolveRequest: (value: Response) => void = () => {};
    const deferred = new Promise<Response>((resolve) => {
      resolveRequest = resolve;
    });

    vi.mocked(fetch).mockReturnValue(deferred as Promise<Response>);

    const { result } = renderHook(() => useUploadSession());

    const blob = new Blob(['x'], { type: 'audio/webm' });
    let uploadPromise: Promise<string>;
    act(() => {
      uploadPromise = result.current.upload(blob, 5);
    });

    await waitFor(() => {
      expect(result.current.isUploading).toBe(true);
    });

    await act(async () => {
      resolveRequest(
        jsonResponse({
          id: 's',
          status: 'UPLOADED',
          createdAt: '2026-04-03T00:00:00.000Z',
          estimatedWaitSecs: 1,
        }),
      );
      await uploadPromise;
    });

    expect(result.current.isUploading).toBe(false);
  });

  it('sets error when response is not ok', async () => {
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse({ error: 'Storage full' }, false, 413),
    );

    const { result } = renderHook(() => useUploadSession());

    await act(async () => {
      await expect(
        result.current.upload(new Blob([], { type: 'audio/webm' }), 1),
      ).rejects.toThrow();
    });

    await waitFor(() => {
      expect(result.current.isUploading).toBe(false);
      expect(result.current.error).toBe('Storage full');
    });
  });

  it('propagates error when success body is invalid', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ unexpected: true }),
    } as Response);

    const { result } = renderHook(() => useUploadSession());

    await act(async () => {
      await expect(
        result.current.upload(new Blob([], { type: 'audio/webm' }), 1),
      ).rejects.toThrow();
    });

    await waitFor(() => {
      expect(result.current.isUploading).toBe(false);
      expect(result.current.error).toBeTruthy();
    });
  });
});
