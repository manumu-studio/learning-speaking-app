// Tests for useSegmentUploader — background segment upload queue
/** @vitest-environment jsdom */
import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useSegmentUploader } from './useSegmentUploader';

describe('useSegmentUploader', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          id: 'session-123',
          status: 'QUEUED',
          createdAt: new Date().toISOString(),
          estimatedWaitSecs: 30,
        }),
      })
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('should upload segment and track status as completed', async () => {
    const { result } = renderHook(() => useSegmentUploader({ topic: 'Test topic' }));
    const blob = new Blob(['audio'], { type: 'audio/webm' });

    act(() => {
      result.current.uploadSegment(blob, 300, 0);
    });

    expect(result.current.segments[0]?.status).toBe('uploading');

    await waitFor(() => {
      expect(result.current.segments[0]?.status).toBe('completed');
    });

    expect(result.current.totalUploaded).toBe(1);
  });

  it('should capture sessionId from upload response', async () => {
    const { result } = renderHook(() => useSegmentUploader());
    const blob = new Blob(['audio'], { type: 'audio/webm' });

    act(() => {
      result.current.uploadSegment(blob, 300, 0);
    });

    await waitFor(() => {
      expect(result.current.latestSessionId).toBe('session-123');
    });
  });

  it('should handle upload failure without blocking next segment', async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Upload failed' }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 'session-456',
          status: 'QUEUED',
          createdAt: new Date().toISOString(),
          estimatedWaitSecs: 30,
        }),
      } as Response);

    const { result } = renderHook(() => useSegmentUploader());
    const blob = new Blob(['audio'], { type: 'audio/webm' });

    act(() => {
      result.current.uploadSegment(blob, 300, 0);
      result.current.uploadSegment(blob, 300, 1);
    });

    await waitFor(() => {
      expect(result.current.totalFailed).toBe(1);
      expect(result.current.totalUploaded).toBe(1);
    });
  });

  it('should validate response with Zod schema', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ invalid: true }),
    } as Response);

    const { result } = renderHook(() => useSegmentUploader());
    const blob = new Blob(['audio'], { type: 'audio/webm' });

    act(() => {
      result.current.uploadSegment(blob, 300, 0);
    });

    await waitFor(() => {
      expect(result.current.segments[0]?.status).toBe('failed');
    });
  });

  it('should process uploads sequentially', async () => {
    const callOrder: number[] = [];
    let resolveFirst: (() => void) | undefined;
    const firstUploadGate = new Promise<void>((resolve) => {
      resolveFirst = resolve;
    });

    vi.mocked(fetch)
      .mockImplementationOnce(async () => {
        callOrder.push(0);
        await firstUploadGate;
        return {
          ok: true,
          json: async () => ({
            id: 'session-first',
            status: 'QUEUED',
            createdAt: new Date().toISOString(),
            estimatedWaitSecs: 30,
          }),
        } as Response;
      })
      .mockImplementationOnce(async () => {
        callOrder.push(1);
        return {
          ok: true,
          json: async () => ({
            id: 'session-second',
            status: 'QUEUED',
            createdAt: new Date().toISOString(),
            estimatedWaitSecs: 30,
          }),
        } as Response;
      });

    const { result } = renderHook(() => useSegmentUploader());
    const blob = new Blob(['audio'], { type: 'audio/webm' });

    act(() => {
      result.current.uploadSegment(blob, 300, 0);
      result.current.uploadSegment(blob, 300, 1);
    });

    await act(async () => {
      await Promise.resolve();
    });

    expect(fetch).toHaveBeenCalledTimes(1);
    expect(callOrder).toEqual([0]);

    await act(async () => {
      resolveFirst?.();
    });

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledTimes(2);
    });

    expect(callOrder).toEqual([0, 1]);
  });

  it('should track totalUploaded and totalFailed counts', async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 'session-ok',
          status: 'QUEUED',
          createdAt: new Date().toISOString(),
          estimatedWaitSecs: 30,
        }),
      } as Response)
      .mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Upload failed' }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 'session-ok-2',
          status: 'QUEUED',
          createdAt: new Date().toISOString(),
          estimatedWaitSecs: 30,
        }),
      } as Response);

    const { result } = renderHook(() => useSegmentUploader());
    const blob = new Blob(['audio'], { type: 'audio/webm' });

    act(() => {
      result.current.uploadSegment(blob, 300, 0);
      result.current.uploadSegment(blob, 300, 1);
      result.current.uploadSegment(blob, 300, 2);
    });

    await waitFor(() => {
      expect(result.current.totalUploaded).toBe(2);
      expect(result.current.totalFailed).toBe(1);
    });
  });

  it('should set isUploading during active upload', async () => {
    let resolveUpload: (() => void) | undefined;
    const uploadGate = new Promise<void>((resolve) => {
      resolveUpload = resolve;
    });

    vi.mocked(fetch).mockImplementationOnce(async () => {
      await uploadGate;
      return {
        ok: true,
        json: async () => ({
          id: 'session-in-flight',
          status: 'QUEUED',
          createdAt: new Date().toISOString(),
          estimatedWaitSecs: 30,
        }),
      } as Response;
    });

    const { result } = renderHook(() => useSegmentUploader());
    const blob = new Blob(['audio'], { type: 'audio/webm' });

    act(() => {
      result.current.uploadSegment(blob, 300, 0);
    });

    expect(result.current.isUploading).toBe(true);

    await act(async () => {
      resolveUpload?.();
    });

    await waitFor(() => {
      expect(result.current.isUploading).toBe(false);
    });
  });
});
