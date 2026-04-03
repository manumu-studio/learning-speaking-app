// Tests for Whisper transcription entry — missing API key fails fast
import { afterEach, describe, expect, it, vi } from 'vitest';

describe('transcribeAudio', () => {
  afterEach(() => {
    vi.resetModules();
  });

  it('rejects when OPENAI_API_KEY is not configured', async () => {
    vi.doMock('@/lib/env', () => ({
      env: { OPENAI_API_KEY: undefined },
    }));
    const { transcribeAudio } = await import('./whisper');
    await expect(transcribeAudio(Buffer.from('x'), 'a.webm')).rejects.toThrow(/OPENAI_API_KEY/);
  });
});
