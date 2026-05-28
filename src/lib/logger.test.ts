// Tests for Pino-based structured logger
import { Writable } from 'node:stream';
import { afterEach, describe, expect, it } from 'vitest';
import pino from 'pino';

function createTestLogger(level: string) {
  const output: string[] = [];
  const stream = new Writable({
    write(chunk, _encoding, callback) {
      output.push(chunk.toString());
      callback();
    },
  });
  const testLogger = pino({ level }, stream);
  return { logger: testLogger, output };
}

function parseLastLine(output: string[]): Record<string, unknown> {
  const last = output.at(-1);
  if (last === undefined) {
    throw new Error('No log output captured');
  }
  return JSON.parse(last) as Record<string, unknown>;
}

describe('logger (Pino)', () => {
  afterEach(() => {
    delete process.env.LOG_LEVEL;
  });

  it('logger.info() produces structured JSON with metadata', () => {
    const { logger, output } = createTestLogger('debug');
    logger.info({ sessionId: 'test-123', duration: 42 }, 'Test message');
    const payload = parseLastLine(output);
    expect(payload.msg).toBe('Test message');
    expect(payload.sessionId).toBe('test-123');
    expect(payload.duration).toBe(42);
    expect(payload.level).toBe(30);
  });

  it('logger.error() serializes error objects via err key', () => {
    const { logger, output } = createTestLogger('debug');
    const err = new Error('Something broke');
    logger.error({ err }, 'Failure');
    const payload = parseLastLine(output) as { err: { message: string; stack?: string } };
    expect(payload.err.message).toBe('Something broke');
    expect(payload.err.stack).toBeDefined();
  });

  it('logger.warn() uses correct numeric level', () => {
    const { logger, output } = createTestLogger('debug');
    logger.warn({ userId: 'u1' }, 'careful');
    const payload = parseLastLine(output);
    expect(payload.level).toBe(40);
    expect(payload.userId).toBe('u1');
  });

  it('logger.debug() respects LOG_LEVEL when set to info', () => {
    const { logger, output } = createTestLogger('info');
    logger.debug({ hidden: true }, 'should not appear');
    expect(output).toHaveLength(0);
  });

  it('logger.debug() appears when LOG_LEVEL is debug', () => {
    const { logger, output } = createTestLogger('debug');
    logger.debug({ trace: true }, 'visible');
    const payload = parseLastLine(output);
    expect(payload.msg).toBe('visible');
    expect(payload.trace).toBe(true);
  });
});
