// Tests for useChunkUploader — chunked session lifecycle: presign, R2 PUT, enqueue, complete, abort
/** @vitest-environment jsdom */
import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { useChunkUploader } from './useChunkUploader';
import type { ChunkReadyEvent } from '@/features/recording/useAudioWorklet.types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function jsonResponse(body: unknown, ok = true): Response {
  return {
    ok,
    status: ok ? 200 : 400,
    json: () => Promise.resolve(body),
  } as Response;
}

function makeChunkEvent(chunkIndex = 0, durationSecs = 10): ChunkReadyEvent {
  return {
    chunkIndex,
    wavBlob: new Blob(['audio-data'], { type: 'audio/wav' }),
    durationSecs,
    isFinal: false,
  };
}

// Happy-path fetch sequence for a single uploadChunk call:
// 1) POST /api/sessions              → session create
// 2) POST /api/sessions/:id/presign  → presign
// 3) PUT <uploadUrl>                 → R2 upload
// 4) POST .../chunks/enqueue         → enqueue
function setupHappyPathMocks(sessionId = 'session-abc'): void {
  vi.mocked(fetch)
    .mockResolvedValueOnce(jsonResponse({ id: sessionId, status: 'CREATED' }))
    .mockResolvedValueOnce(
      jsonResponse({ uploadUrl: 'https://r2.example.com/obj', storageKey: 'key-1', chunkIndex: 0 }),
    )
    .mockResolvedValueOnce(jsonResponse({}, true))
    .mockResolvedValueOnce(jsonResponse({ sessionId, chunkIndex: 0, status: 'QUEUED' }));
}

// Happy-path for uploadChunkIndependent (uses enqueue-independent endpoint)
function setupIndependentHappyPathMocks(sessionId = 'session-abc'): void {
  vi.mocked(fetch)
    .mockResolvedValueOnce(jsonResponse({ id: sessionId, status: 'CREATED' }))
    .mockResolvedValueOnce(
      jsonResponse({ uploadUrl: 'https://r2.example.com/obj', storageKey: 'key-1', chunkIndex: 0 }),
    )
    .mockResolvedValueOnce(jsonResponse({}, true))
    .mockResolvedValueOnce(jsonResponse({ sessionId, chunkIndex: 0, status: 'QUEUED' }));
}

// ---------------------------------------------------------------------------
// Tests — no fake timers by default; only the timeout test uses them
// ---------------------------------------------------------------------------

describe('useChunkUploader', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  // -------------------------------------------------------------------------
  // Initial state
  // -------------------------------------------------------------------------

  describe('initial state', () => {
    it('starts with empty chunks, null sessionId, not uploading, no error', () => {
      const { result } = renderHook(() => useChunkUploader());
      expect(result.current.chunks).toEqual([]);
      expect(result.current.sessionId).toBeNull();
      expect(result.current.isUploading).toBe(false);
      expect(result.current.inFlightChunks).toBe(0);
      expect(result.current.error).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // ensureSession
  // -------------------------------------------------------------------------

  describe('ensureSession', () => {
    it('creates a session and returns the id', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({ id: 'sess-1', status: 'CREATED' }));

      const { result } = renderHook(() => useChunkUploader());

      let returnedId = '';
      await act(async () => {
        returnedId = await result.current.ensureSession();
      });

      expect(returnedId).toBe('sess-1');
      expect(result.current.sessionId).toBe('sess-1');
    });

    it('reuses the session id on a second call without a new fetch', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({ id: 'sess-reuse', status: 'CREATED' }));

      const { result } = renderHook(() => useChunkUploader());

      await act(async () => {
        await result.current.ensureSession();
        await result.current.ensureSession(); // second call — should not fetch again
      });

      expect(vi.mocked(fetch)).toHaveBeenCalledTimes(1);
      expect(result.current.sessionId).toBe('sess-reuse');
    });

    it('includes config fields in the session create request body', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({ id: 's', status: 'CREATED' }));

      const { result } = renderHook(() =>
        useChunkUploader({
          topic: 'daily routines',
          focus: { focusKey: 'vocabularyPrecision', focusLabel: 'Vocab Precision' },
          promptUsed: 'Tell me about your day.',
          isOnboarding: true,
        }),
      );

      await act(async () => {
        await result.current.ensureSession();
      });

      const [, init] = vi.mocked(fetch).mock.calls[0] ?? [];
      const body = JSON.parse((init?.body as string) ?? '{}') as Record<string, unknown>;
      // focusLabel takes priority over topic
      expect(body['topic']).toBe('Vocab Precision');
      expect(body['focusMetricKey']).toBe('vocabularyPrecision');
      expect(body['promptUsed']).toBe('Tell me about your day.');
      expect(body['isOnboarding']).toBe(true);
      expect(body['chunked']).toBe(true);
      expect(body['language']).toBe('en');
    });

    it('uses topic when focus is absent', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({ id: 's', status: 'CREATED' }));

      const { result } = renderHook(() => useChunkUploader({ topic: 'my topic' }));

      await act(async () => {
        await result.current.ensureSession();
      });

      const [, init] = vi.mocked(fetch).mock.calls[0] ?? [];
      const body = JSON.parse((init?.body as string) ?? '{}') as Record<string, unknown>;
      expect(body['topic']).toBe('my topic');
      expect(body['focusMetricKey']).toBeNull();
    });

    it('sends null topic and null focusMetricKey when neither is provided', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({ id: 's', status: 'CREATED' }));

      const { result } = renderHook(() => useChunkUploader());

      await act(async () => {
        await result.current.ensureSession();
      });

      const [, init] = vi.mocked(fetch).mock.calls[0] ?? [];
      const body = JSON.parse((init?.body as string) ?? '{}') as Record<string, unknown>;
      expect(body['topic']).toBeNull();
      expect(body['focusMetricKey']).toBeNull();
      expect(body['isOnboarding']).toBe(false);
    });

    it('throws when the session create request is not ok', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({ error: 'Server error' }, false));

      const { result } = renderHook(() => useChunkUploader());

      await act(async () => {
        await expect(result.current.ensureSession()).rejects.toThrow('Server error');
      });
    });

    it('throws "Upload failed" when error response body is not parseable', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: () => Promise.reject(new Error('bad json')),
      } as unknown as Response);

      const { result } = renderHook(() => useChunkUploader());

      await act(async () => {
        await expect(result.current.ensureSession()).rejects.toThrow('Upload failed');
      });
    });
  });

  // -------------------------------------------------------------------------
  // uploadChunk (queued)
  // -------------------------------------------------------------------------

  describe('uploadChunk', () => {
    it('happy path: chunk moves from uploading → completed', async () => {
      setupHappyPathMocks('s-1');
      const { result } = renderHook(() => useChunkUploader());

      act(() => {
        result.current.uploadChunk(makeChunkEvent(0, 10));
      });

      expect(result.current.isUploading).toBe(true);
      expect(result.current.chunks[0]?.status).toBe('uploading');

      await waitFor(() => {
        expect(result.current.chunks[0]?.status).toBe('completed');
      }, { timeout: 10000 });

      expect(result.current.isUploading).toBe(false);
      expect(result.current.error).toBeNull();
    }, 15000);

    it('sets error and marks chunk failed when presign fails', async () => {
      vi.mocked(fetch)
        .mockResolvedValueOnce(jsonResponse({ id: 's', status: 'CREATED' }))
        .mockResolvedValueOnce(jsonResponse({ error: 'Presign failed' }, false));

      const { result } = renderHook(() => useChunkUploader());

      act(() => {
        result.current.uploadChunk(makeChunkEvent(0));
      });

      await waitFor(() => {
        expect(result.current.chunks[0]?.status).toBe('failed');
      }, { timeout: 10000 });

      expect(result.current.error).toBe('Presign failed');
      expect(result.current.chunks[0]?.error).toBe('Presign failed');
      expect(result.current.isUploading).toBe(false);
    }, 15000);

    it('marks chunk failed when R2 PUT is not ok', async () => {
      vi.mocked(fetch)
        .mockResolvedValueOnce(jsonResponse({ id: 's', status: 'CREATED' }))
        .mockResolvedValueOnce(
          jsonResponse({ uploadUrl: 'https://r2.example.com/obj', storageKey: 'k', chunkIndex: 0 }),
        )
        .mockResolvedValueOnce(jsonResponse({}, false)); // PUT fails

      const { result } = renderHook(() => useChunkUploader());

      act(() => {
        result.current.uploadChunk(makeChunkEvent(0));
      });

      await waitFor(() => {
        expect(result.current.chunks[0]?.status).toBe('failed');
      }, { timeout: 10000 });

      expect(result.current.error).toBe('Failed to upload chunk to storage');
    }, 15000);

    it('marks chunk failed when enqueue is not ok', async () => {
      vi.mocked(fetch)
        .mockResolvedValueOnce(jsonResponse({ id: 's', status: 'CREATED' }))
        .mockResolvedValueOnce(
          jsonResponse({ uploadUrl: 'https://r2.example.com/obj', storageKey: 'k', chunkIndex: 0 }),
        )
        .mockResolvedValueOnce(jsonResponse({}, true))
        .mockResolvedValueOnce(jsonResponse({ error: 'Enqueue failed' }, false));

      const { result } = renderHook(() => useChunkUploader());

      act(() => {
        result.current.uploadChunk(makeChunkEvent(0));
      });

      await waitFor(() => {
        expect(result.current.chunks[0]?.status).toBe('failed');
      }, { timeout: 10000 });

      expect(result.current.error).toBe('Enqueue failed');
    }, 15000);

    it('sends overlapSecs=0 for chunk index 0', async () => {
      setupHappyPathMocks('s-overlap');
      const { result } = renderHook(() => useChunkUploader());

      act(() => {
        result.current.uploadChunk(makeChunkEvent(0, 30));
      });

      await waitFor(() => {
        expect(result.current.chunks[0]?.status).toBe('completed');
      }, { timeout: 10000 });

      const calls = vi.mocked(fetch).mock.calls;
      const enqueueCall = calls.find(([url]) => typeof url === 'string' && (url as string).includes('enqueue'));
      const body = JSON.parse((enqueueCall?.[1]?.body as string) ?? '{}') as Record<string, unknown>;
      expect(body['overlapSecs']).toBe(0);
    }, 15000);

    it('sends overlapSecs=5 for chunk index > 0', async () => {
      const sessionId = 's-overlap-1';
      // Session already created: mock session endpoint (will be deduplicated by hook after first call)
      // Since sessionId doesn't exist yet, we need to prime it first via ensureSession
      vi.mocked(fetch)
        .mockResolvedValueOnce(jsonResponse({ id: sessionId, status: 'CREATED' }))
        .mockResolvedValueOnce(
          jsonResponse({ uploadUrl: 'https://r2.example.com/obj', storageKey: 'k1', chunkIndex: 1 }),
        )
        .mockResolvedValueOnce(jsonResponse({}, true))
        .mockResolvedValueOnce(jsonResponse({ sessionId, chunkIndex: 1, status: 'QUEUED' }));

      const { result } = renderHook(() => useChunkUploader());

      act(() => {
        result.current.uploadChunk(makeChunkEvent(1, 30));
      });

      await waitFor(() => {
        expect(result.current.chunks[0]?.status).toBe('completed');
      }, { timeout: 10000 });

      const calls = vi.mocked(fetch).mock.calls;
      const enqueueCall = calls.find(([url]) => typeof url === 'string' && (url as string).includes('enqueue'));
      const body = JSON.parse((enqueueCall?.[1]?.body as string) ?? '{}') as Record<string, unknown>;
      expect(body['overlapSecs']).toBe(5);
    }, 15000);

    it('queues multiple chunks serially', async () => {
      const sessionId = 's-serial';
      vi.mocked(fetch)
        .mockResolvedValueOnce(jsonResponse({ id: sessionId, status: 'CREATED' }))
        .mockResolvedValueOnce(
          jsonResponse({ uploadUrl: 'https://r2.example.com/1', storageKey: 'k0', chunkIndex: 0 }),
        )
        .mockResolvedValueOnce(jsonResponse({}, true))
        .mockResolvedValueOnce(jsonResponse({ sessionId, chunkIndex: 0, status: 'QUEUED' }))
        .mockResolvedValueOnce(
          jsonResponse({ uploadUrl: 'https://r2.example.com/2', storageKey: 'k1', chunkIndex: 1 }),
        )
        .mockResolvedValueOnce(jsonResponse({}, true))
        .mockResolvedValueOnce(jsonResponse({ sessionId, chunkIndex: 1, status: 'QUEUED' }));

      const { result } = renderHook(() => useChunkUploader());

      act(() => {
        result.current.uploadChunk(makeChunkEvent(0));
        result.current.uploadChunk(makeChunkEvent(1));
      });

      await waitFor(() => {
        expect(result.current.chunks).toHaveLength(2);
        expect(result.current.chunks.every((c) => c.status === 'completed')).toBe(true);
      }, { timeout: 10000 });
    }, 15000);

    it('uses "Chunk upload failed" fallback for non-Error throws', async () => {
      vi.mocked(fetch)
        .mockResolvedValueOnce(jsonResponse({ id: 's', status: 'CREATED' }))
        .mockRejectedValueOnce('string error'); // non-Error reject

      const { result } = renderHook(() => useChunkUploader());

      act(() => {
        result.current.uploadChunk(makeChunkEvent(0));
      });

      await waitFor(() => {
        expect(result.current.error).toBe('Chunk upload failed');
      }, { timeout: 10000 });
    }, 15000);

    it('rounds fractional durationSecs to nearest integer, clamped to min 1', async () => {
      setupHappyPathMocks('s-round');
      const { result } = renderHook(() => useChunkUploader());

      act(() => {
        result.current.uploadChunk(makeChunkEvent(0, 0.3)); // rounds to 0, clamped to 1
      });

      await waitFor(() => {
        expect(result.current.chunks[0]?.status).toBe('completed');
      }, { timeout: 10000 });

      const calls = vi.mocked(fetch).mock.calls;
      const enqueueCall = calls.find(([url]) => typeof url === 'string' && (url as string).includes('enqueue'));
      const body = JSON.parse((enqueueCall?.[1]?.body as string) ?? '{}') as Record<string, unknown>;
      expect(body['durationSecs']).toBe(1);
    }, 15000);
  });

  // -------------------------------------------------------------------------
  // uploadChunkIndependent (parallel)
  // -------------------------------------------------------------------------

  describe('uploadChunkIndependent', () => {
    it('happy path: chunk moves from uploading → completed, inFlightChunks returns to 0', async () => {
      setupIndependentHappyPathMocks('s-ind');
      const { result } = renderHook(() => useChunkUploader());

      act(() => {
        result.current.uploadChunkIndependent(makeChunkEvent(0));
      });

      expect(result.current.inFlightChunks).toBe(1);
      expect(result.current.isUploading).toBe(true);

      await waitFor(() => {
        expect(result.current.chunks[0]?.status).toBe('completed');
      }, { timeout: 10000 });

      expect(result.current.inFlightChunks).toBe(0);
      expect(result.current.isUploading).toBe(false);
    }, 15000);

    it('marks chunk as failed with error message on enqueue failure', async () => {
      vi.mocked(fetch)
        .mockResolvedValueOnce(jsonResponse({ id: 's', status: 'CREATED' }))
        .mockResolvedValueOnce(
          jsonResponse({ uploadUrl: 'https://r2.example.com/obj', storageKey: 'k', chunkIndex: 0 }),
        )
        .mockResolvedValueOnce(jsonResponse({}, true))
        .mockResolvedValueOnce(jsonResponse({ error: 'Queue down' }, false));

      const { result } = renderHook(() => useChunkUploader());

      act(() => {
        result.current.uploadChunkIndependent(makeChunkEvent(0));
      });

      await waitFor(() => {
        expect(result.current.chunks[0]?.status).toBe('failed');
      }, { timeout: 10000 });

      expect(result.current.error).toBe('Queue down');
      expect(result.current.inFlightChunks).toBe(0);
    }, 15000);

    it('marks chunk failed with "Cancelled" on AbortError — does not set global error', async () => {
      const abortError = Object.assign(new Error('Aborted'), { name: 'AbortError' });
      vi.mocked(fetch)
        .mockResolvedValueOnce(jsonResponse({ id: 's', status: 'CREATED' }))
        .mockRejectedValueOnce(abortError);

      const { result } = renderHook(() => useChunkUploader());

      act(() => {
        result.current.uploadChunkIndependent(makeChunkEvent(0));
      });

      await waitFor(() => {
        expect(result.current.chunks[0]?.status).toBe('failed');
      }, { timeout: 10000 });

      expect(result.current.chunks[0]?.error).toBe('Cancelled');
      expect(result.current.error).toBeNull(); // global error NOT set for aborts
    }, 15000);

    it('sends overlapSecs=5 for chunk index > 0 via enqueue-independent endpoint', async () => {
      const sessionId = 's-ind-overlap';
      vi.mocked(fetch)
        .mockResolvedValueOnce(jsonResponse({ id: sessionId, status: 'CREATED' }))
        .mockResolvedValueOnce(
          jsonResponse({ uploadUrl: 'https://r2.example.com/obj', storageKey: 'k1', chunkIndex: 1 }),
        )
        .mockResolvedValueOnce(jsonResponse({}, true))
        .mockResolvedValueOnce(jsonResponse({ sessionId, chunkIndex: 1, status: 'QUEUED' }));

      const { result } = renderHook(() => useChunkUploader());

      act(() => {
        result.current.uploadChunkIndependent(makeChunkEvent(1, 30));
      });

      await waitFor(() => {
        expect(result.current.chunks[0]?.status).toBe('completed');
      }, { timeout: 10000 });

      const calls = vi.mocked(fetch).mock.calls;
      const enqueueCall = calls.find(
        ([url]) => typeof url === 'string' && (url as string).includes('enqueue-independent'),
      );
      const body = JSON.parse((enqueueCall?.[1]?.body as string) ?? '{}') as Record<string, unknown>;
      expect(body['overlapSecs']).toBe(5);
    }, 15000);

    it('marks chunk failed with "Chunk upload failed" for non-Error throws', async () => {
      vi.mocked(fetch)
        .mockResolvedValueOnce(jsonResponse({ id: 's', status: 'CREATED' }))
        .mockRejectedValueOnce('plain string rejection');

      const { result } = renderHook(() => useChunkUploader());

      act(() => {
        result.current.uploadChunkIndependent(makeChunkEvent(0));
      });

      await waitFor(() => {
        expect(result.current.chunks[0]?.status).toBe('failed');
      }, { timeout: 10000 });

      expect(result.current.error).toBe('Chunk upload failed');
    }, 15000);

    it('marks chunk failed when presign is not ok (independent path)', async () => {
      vi.mocked(fetch)
        .mockResolvedValueOnce(jsonResponse({ id: 's', status: 'CREATED' }))
        .mockResolvedValueOnce(jsonResponse({ error: 'Presign down' }, false));

      const { result } = renderHook(() => useChunkUploader());

      act(() => {
        result.current.uploadChunkIndependent(makeChunkEvent(0));
      });

      await waitFor(() => {
        expect(result.current.chunks[0]?.status).toBe('failed');
      }, { timeout: 10000 });

      expect(result.current.error).toBe('Presign down');
    }, 15000);

    it('marks chunk failed when R2 PUT is not ok (independent path)', async () => {
      vi.mocked(fetch)
        .mockResolvedValueOnce(jsonResponse({ id: 's', status: 'CREATED' }))
        .mockResolvedValueOnce(
          jsonResponse({ uploadUrl: 'https://r2.example.com/obj', storageKey: 'k', chunkIndex: 0 }),
        )
        .mockResolvedValueOnce(jsonResponse({}, false)); // PUT fails

      const { result } = renderHook(() => useChunkUploader());

      act(() => {
        result.current.uploadChunkIndependent(makeChunkEvent(0));
      });

      await waitFor(() => {
        expect(result.current.chunks[0]?.status).toBe('failed');
      }, { timeout: 10000 });

      expect(result.current.error).toBe('Failed to upload chunk to storage');
    }, 15000);
  });

  // -------------------------------------------------------------------------
  // abortAllUploads
  // -------------------------------------------------------------------------

  describe('abortAllUploads', () => {
    it('clears all abort controllers without throwing', async () => {
      // presign hangs so there is an in-flight upload
      vi.mocked(fetch)
        .mockResolvedValueOnce(jsonResponse({ id: 's-abort', status: 'CREATED' }))
        .mockImplementation(() => new Promise(() => {})); // presign hangs

      const { result } = renderHook(() => useChunkUploader());

      act(() => {
        result.current.uploadChunkIndependent(makeChunkEvent(0));
      });

      // Let session creation resolve
      await act(async () => {
        await Promise.resolve();
        await Promise.resolve();
      });

      act(() => {
        result.current.abortAllUploads();
      });

      // After abort, global error should still be null (AbortError is swallowed)
      expect(result.current.error).toBeNull();
    });

    it('is a no-op when there are no in-flight uploads', () => {
      const { result } = renderHook(() => useChunkUploader());

      expect(() => {
        act(() => {
          result.current.abortAllUploads();
        });
      }).not.toThrow();
    });
  });

  // -------------------------------------------------------------------------
  // completeSession
  // -------------------------------------------------------------------------

  describe('completeSession', () => {
    it('returns null when no session has been created', async () => {
      const { result } = renderHook(() => useChunkUploader());

      let returnValue: string | null = 'initial';
      await act(async () => {
        returnValue = await result.current.completeSession(30);
      });

      expect(returnValue).toBeNull();
      expect(fetch).not.toHaveBeenCalled();
    });

    it('returns sessionId on successful completion after uploadChunk', async () => {
      setupHappyPathMocks('s-complete');
      vi.mocked(fetch).mockResolvedValueOnce(
        jsonResponse({ sessionId: 's-complete', chunkCount: 1, status: 'DONE' }),
      );

      const { result } = renderHook(() => useChunkUploader());

      act(() => {
        result.current.uploadChunk(makeChunkEvent(0, 30));
      });

      await waitFor(() => {
        expect(result.current.chunks[0]?.status).toBe('completed');
      }, { timeout: 10000 });

      let completedId: string | null = null;
      await act(async () => {
        completedId = await result.current.completeSession(30);
      });

      expect(completedId).toBe('s-complete');
    }, 15000);

    it('sets error and returns null when complete endpoint fails', async () => {
      setupHappyPathMocks('s-fail-complete');
      vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({ error: 'Complete failed' }, false));

      const { result } = renderHook(() => useChunkUploader());

      act(() => {
        result.current.uploadChunk(makeChunkEvent(0, 30));
      });

      await waitFor(() => {
        expect(result.current.chunks[0]?.status).toBe('completed');
      }, { timeout: 10000 });

      let completedId: string | null = 'initial';
      await act(async () => {
        completedId = await result.current.completeSession(30);
      });

      expect(completedId).toBeNull();
      expect(result.current.error).toBe('Complete failed');
    }, 15000);

    it('sends chunkCount=1 as minimum and durationSecs clamped to at least 1', async () => {
      vi.mocked(fetch)
        .mockResolvedValueOnce(jsonResponse({ id: 's-minchunk', status: 'CREATED' }))
        .mockResolvedValueOnce(
          jsonResponse({ sessionId: 's-minchunk', chunkCount: 1, status: 'DONE' }),
        );

      const { result } = renderHook(() => useChunkUploader());

      await act(async () => {
        await result.current.ensureSession();
      });

      await act(async () => {
        await result.current.completeSession(0); // duration 0 → should be clamped to 1
      });

      const calls = vi.mocked(fetch).mock.calls;
      const completeCall = calls.find(
        ([url]) => typeof url === 'string' && (url as string).includes('complete'),
      );
      const body = JSON.parse((completeCall?.[1]?.body as string) ?? '{}') as Record<string, unknown>;
      expect(body['chunkCount']).toBe(1); // Math.max(1, maxChunkIndex + 1) = Math.max(1, 0) = 1
      expect(body['durationSecs']).toBe(1);
    });

    it('sends correct chunkCount after uploading multiple chunks', async () => {
      const sessionId = 's-chunkcount';
      vi.mocked(fetch)
        .mockResolvedValueOnce(jsonResponse({ id: sessionId, status: 'CREATED' }))
        .mockResolvedValueOnce(
          jsonResponse({ uploadUrl: 'https://r2.example.com/1', storageKey: 'k0', chunkIndex: 0 }),
        )
        .mockResolvedValueOnce(jsonResponse({}, true))
        .mockResolvedValueOnce(jsonResponse({ sessionId, chunkIndex: 0, status: 'QUEUED' }))
        .mockResolvedValueOnce(
          jsonResponse({ uploadUrl: 'https://r2.example.com/2', storageKey: 'k1', chunkIndex: 1 }),
        )
        .mockResolvedValueOnce(jsonResponse({}, true))
        .mockResolvedValueOnce(jsonResponse({ sessionId, chunkIndex: 1, status: 'QUEUED' }))
        .mockResolvedValueOnce(
          jsonResponse({ sessionId, chunkCount: 2, status: 'DONE' }),
        );

      const { result } = renderHook(() => useChunkUploader());

      act(() => {
        result.current.uploadChunk(makeChunkEvent(0));
        result.current.uploadChunk(makeChunkEvent(1));
      });

      await waitFor(() => {
        expect(result.current.chunks).toHaveLength(2);
        expect(result.current.chunks.every((c) => c.status === 'completed')).toBe(true);
      }, { timeout: 10000 });

      await act(async () => {
        await result.current.completeSession(60);
      });

      const calls = vi.mocked(fetch).mock.calls;
      const completeCall = calls.find(
        ([url]) => typeof url === 'string' && (url as string).includes('complete'),
      );
      const body = JSON.parse((completeCall?.[1]?.body as string) ?? '{}') as Record<string, unknown>;
      expect(body['chunkCount']).toBe(2); // maxChunkIndexRef = 1, so 1+1=2
    }, 15000);
  });

  // -------------------------------------------------------------------------
  // resetUploader
  // -------------------------------------------------------------------------

  describe('resetUploader', () => {
    it('resets all state back to initial values after a completed upload', async () => {
      setupHappyPathMocks('s-reset');
      const { result } = renderHook(() => useChunkUploader());

      act(() => {
        result.current.uploadChunk(makeChunkEvent(0));
      });

      await waitFor(() => {
        expect(result.current.chunks[0]?.status).toBe('completed');
      }, { timeout: 10000 });

      act(() => {
        result.current.resetUploader();
      });

      expect(result.current.chunks).toEqual([]);
      expect(result.current.sessionId).toBeNull();
      expect(result.current.isUploading).toBe(false);
      expect(result.current.inFlightChunks).toBe(0);
      expect(result.current.error).toBeNull();
    }, 15000);

    it('allows creating a new session after reset', async () => {
      vi.mocked(fetch)
        .mockResolvedValueOnce(jsonResponse({ id: 'sess-1', status: 'CREATED' }))
        .mockResolvedValueOnce(jsonResponse({ id: 'sess-2', status: 'CREATED' }));

      const { result } = renderHook(() => useChunkUploader());

      await act(async () => {
        await result.current.ensureSession();
      });

      expect(result.current.sessionId).toBe('sess-1');

      act(() => {
        result.current.resetUploader();
      });

      await act(async () => {
        await result.current.ensureSession();
      });

      expect(result.current.sessionId).toBe('sess-2');
      expect(vi.mocked(fetch)).toHaveBeenCalledTimes(2);
    });
  });

  // -------------------------------------------------------------------------
  // waitForInFlightUploads
  // -------------------------------------------------------------------------

  describe('waitForInFlightUploads', () => {
    it('resolves immediately when there are no in-flight uploads', async () => {
      const { result } = renderHook(() => useChunkUploader());

      await act(async () => {
        await result.current.waitForInFlightUploads(5000);
      });

      expect(result.current.inFlightChunks).toBe(0);
    });

    it('resolves after uploads complete when called after the fact', async () => {
      setupIndependentHappyPathMocks('s-wait');
      const { result } = renderHook(() => useChunkUploader());

      act(() => {
        result.current.uploadChunkIndependent(makeChunkEvent(0));
      });

      expect(result.current.inFlightChunks).toBe(1);

      // Wait for upload to finish naturally
      await waitFor(() => {
        expect(result.current.inFlightChunks).toBe(0);
      }, { timeout: 10000 });

      // Now waitForInFlightUploads should resolve immediately
      await act(async () => {
        await result.current.waitForInFlightUploads(1000);
      });

      expect(result.current.inFlightChunks).toBe(0);
    }, 15000);

    it('resolves after timeout when uploads remain in-flight', async () => {
      // presign never resolves so upload stays in-flight
      vi.mocked(fetch)
        .mockResolvedValueOnce(jsonResponse({ id: 's-timeout', status: 'CREATED' }))
        .mockImplementation(() => new Promise(() => {})); // presign hangs forever

      vi.useFakeTimers();

      const { result } = renderHook(() => useChunkUploader());

      act(() => {
        result.current.uploadChunkIndependent(makeChunkEvent(0));
      });

      // Let session creation run
      await act(async () => {
        await Promise.resolve();
        await Promise.resolve();
      });

      expect(result.current.inFlightChunks).toBe(1);

      // Start waitForInFlightUploads with a short timeout, then advance fake timers
      let waitDone = false;
      const waitPromise = result.current.waitForInFlightUploads(500).then(() => {
        waitDone = true;
      });

      await act(async () => {
        vi.advanceTimersByTime(1000);
        await waitPromise;
      });

      expect(waitDone).toBe(true);
      // Upload is still in-flight since it was never resolved
      expect(result.current.inFlightChunks).toBe(1);

      vi.useRealTimers();
    }, 15000);
  });
});
