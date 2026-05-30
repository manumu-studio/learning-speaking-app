// Tests for Praat microservice HTTP client
import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('@/lib/env', () => ({
  env: {
    PRAAT_SERVICE_URL: undefined,
    PRAAT_API_KEY: undefined,
  },
}));

vi.mock('@/lib/logger', () => ({
  logger: { warn: vi.fn(), info: vi.fn(), debug: vi.fn(), error: vi.fn() },
}));

describe('extractContour', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('returns null when PRAAT_SERVICE_URL is not configured', async () => {
    const { extractContour } = await import('@/lib/praat/client');
    const result = await extractContour('https://example.com/audio.wav', 30);
    expect(result).toBeNull();
  });

  it('returns null when service returns non-OK status', async () => {
    vi.doMock('@/lib/env', () => ({
      env: {
        PRAAT_SERVICE_URL: 'https://praat.example.com',
        PRAAT_API_KEY: 'test-key',
      },
    }));

    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(null, { status: 500 }),
    );

    const { extractContour } = await import('@/lib/praat/client');
    const result = await extractContour('https://example.com/audio.wav', 30);
    expect(result).toBeNull();
    fetchSpy.mockRestore();
  });

  it('returns mapped contour data on success', async () => {
    vi.doMock('@/lib/env', () => ({
      env: {
        PRAAT_SERVICE_URL: 'https://praat.example.com',
        PRAAT_API_KEY: 'test-key',
      },
    }));

    const payload = {
      status: 'ok',
      contour: {
        frame_ms: 10,
        f0_hz: [120, 130, 0],
        intensity_db: [60, 62, 55],
        voiced: [true, true, false],
        duration_ms: 30,
      },
    };

    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify(payload), { status: 200 }),
    );

    const { extractContour } = await import('@/lib/praat/client');
    const result = await extractContour('https://example.com/audio.wav', 0.03);

    expect(result).not.toBeNull();
    expect(result?.frameMs).toBe(10);
    expect(result?.f0Hz).toEqual([120, 130, 0]);
    expect(result?.voiced).toEqual([true, true, false]);
    fetchSpy.mockRestore();
  });

  it('returns null when fetch throws', async () => {
    vi.doMock('@/lib/env', () => ({
      env: {
        PRAAT_SERVICE_URL: 'https://praat.example.com',
        PRAAT_API_KEY: 'test-key',
      },
    }));

    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(
      new Error('Network error'),
    );

    const { extractContour } = await import('@/lib/praat/client');
    const result = await extractContour('https://example.com/audio.wav', 30);
    expect(result).toBeNull();
    fetchSpy.mockRestore();
  });
});
