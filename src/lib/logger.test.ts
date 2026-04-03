// Tests for logger — structured JSON output and level routing
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/env', () => ({
  env: { NODE_ENV: 'test' },
}));

import { log } from './logger';

describe('log', () => {
  beforeEach(() => {
    vi.spyOn(console, 'info').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('writes info logs as JSON via console.info', () => {
    log({ level: 'info', message: 'hello', sessionId: 's1' });
    expect(console.info).toHaveBeenCalledTimes(1);
    const payload = JSON.parse(String(vi.mocked(console.info).mock.calls[0]?.[0])) as {
      level: string;
      message: string;
      sessionId: string;
      environment: string;
    };
    expect(payload.level).toBe('info');
    expect(payload.message).toBe('hello');
    expect(payload.sessionId).toBe('s1');
    expect(payload.environment).toBe('test');
  });

  it('routes warn level to console.warn', () => {
    log({ level: 'warn', message: 'careful' });
    expect(console.warn).toHaveBeenCalled();
    expect(console.info).not.toHaveBeenCalled();
  });

  it('routes error level to console.error', () => {
    log({ level: 'error', message: 'failed', error: 'boom' });
    expect(console.error).toHaveBeenCalled();
    const payload = JSON.parse(String(vi.mocked(console.error).mock.calls[0]?.[0])) as {
      error: string;
    };
    expect(payload.error).toBe('boom');
  });
});
