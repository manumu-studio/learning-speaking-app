// Tests for api helpers — JSON responses and audio file validation
/** @vitest-environment jsdom */
import { describe, expect, it } from 'vitest';
import { errorResponse, successResponse, validateAudioFile } from './api';

describe('api', () => {
  it('errorResponse returns JSON body with status', async () => {
    const res = errorResponse('Bad', 'E_BAD', 422);
    expect(res.status).toBe(422);
    const body = (await res.json()) as { error: string; code: string };
    expect(body.error).toBe('Bad');
    expect(body.code).toBe('E_BAD');
  });

  it('successResponse serializes data', async () => {
    const res = successResponse({ ok: true }, 201);
    expect(res.status).toBe(201);
    expect(await res.json()).toEqual({ ok: true });
  });

  it('validateAudioFile rejects oversize files', () => {
    const file = new File([new Uint8Array(10)], 'a.webm', { type: 'audio/webm' });
    Object.defineProperty(file, 'size', { value: 2 * 1024 * 1024 });
    const result = validateAudioFile(file, 1);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('1MB');
  });

  it('validateAudioFile rejects non-audio MIME types', () => {
    const file = new File(['x'], 'x.txt', { type: 'text/plain' });
    const result = validateAudioFile(file);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('audio');
  });

  it('validateAudioFile accepts audio under limit', () => {
    const file = new File(['x'], 'x.webm', { type: 'audio/webm' });
    expect(validateAudioFile(file)).toEqual({ valid: true });
  });
});
