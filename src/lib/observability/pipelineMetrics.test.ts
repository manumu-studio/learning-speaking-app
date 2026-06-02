// Unit tests for logPipelineStage — covers all branches of the pipeline metrics logger
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@sentry/nextjs', () => ({
  addBreadcrumb: vi.fn(),
}));

vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
  },
}));

import * as Sentry from '@sentry/nextjs';
import { logger } from '@/lib/logger';
import { logPipelineStage } from './pipelineMetrics';

const mockAddBreadcrumb = vi.mocked(Sentry.addBreadcrumb);
const mockLoggerInfo = vi.mocked(logger.info);

beforeEach(() => {
  vi.clearAllMocks();
});

describe('logPipelineStage', () => {
  describe('successful stage', () => {
    it('logs info with event, sessionId, stage, durationMs, success true', () => {
      logPipelineStage({
        sessionId: 'sess-001',
        stage: 'transcription',
        durationMs: 1234,
        success: true,
      });

      expect(mockLoggerInfo).toHaveBeenCalledOnce();
      expect(mockLoggerInfo).toHaveBeenCalledWith(
        {
          event: 'pipeline.stage',
          sessionId: 'sess-001',
          stage: 'transcription',
          durationMs: 1234,
          success: true,
        },
        'Pipeline transcription completed in 1234ms',
      );
    });

    it('adds a Sentry breadcrumb with level "info" when success is true', () => {
      logPipelineStage({
        sessionId: 'sess-001',
        stage: 'transcription',
        durationMs: 1234,
        success: true,
      });

      expect(mockAddBreadcrumb).toHaveBeenCalledOnce();
      expect(mockAddBreadcrumb).toHaveBeenCalledWith({
        category: 'pipeline',
        message: 'transcription',
        level: 'info',
        data: { sessionId: 'sess-001', durationMs: 1234, success: true },
      });
    });
  });

  describe('failed stage', () => {
    it('logs info with success false and a "failed" message', () => {
      logPipelineStage({
        sessionId: 'sess-002',
        stage: 'scoring',
        durationMs: 500,
        success: false,
      });

      expect(mockLoggerInfo).toHaveBeenCalledWith(
        {
          event: 'pipeline.stage',
          sessionId: 'sess-002',
          stage: 'scoring',
          durationMs: 500,
          success: false,
        },
        'Pipeline scoring failed in 500ms',
      );
    });

    it('adds a Sentry breadcrumb with level "error" when success is false', () => {
      logPipelineStage({
        sessionId: 'sess-002',
        stage: 'scoring',
        durationMs: 500,
        success: false,
      });

      expect(mockAddBreadcrumb).toHaveBeenCalledWith(
        expect.objectContaining({ level: 'error' }),
      );
    });
  });

  describe('optional metadata', () => {
    it('spreads metadata fields into the log object when provided', () => {
      logPipelineStage({
        sessionId: 'sess-003',
        stage: 'analysis',
        durationMs: 800,
        success: true,
        metadata: { wordCount: 42, retries: 1 },
      });

      expect(mockLoggerInfo).toHaveBeenCalledWith(
        expect.objectContaining({ wordCount: 42, retries: 1 }),
        expect.any(String),
      );
    });

    it('does not include extra keys when metadata is omitted', () => {
      logPipelineStage({
        sessionId: 'sess-004',
        stage: 'upload',
        durationMs: 200,
        success: true,
      });

      const [loggedData] = mockLoggerInfo.mock.calls[0] as [Record<string, unknown>, string];
      expect(Object.keys(loggedData)).toEqual([
        'event',
        'sessionId',
        'stage',
        'durationMs',
        'success',
      ]);
    });
  });

  describe('Sentry breadcrumb data', () => {
    it('always uses category "pipeline"', () => {
      logPipelineStage({ sessionId: 's', stage: 'any', durationMs: 1, success: true });
      expect(mockAddBreadcrumb).toHaveBeenCalledWith(
        expect.objectContaining({ category: 'pipeline' }),
      );
    });

    it('sets message to the stage name', () => {
      logPipelineStage({ sessionId: 's', stage: 'my-stage', durationMs: 1, success: true });
      expect(mockAddBreadcrumb).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'my-stage' }),
      );
    });

    it('includes sessionId and durationMs in breadcrumb data', () => {
      logPipelineStage({ sessionId: 'sid-xyz', stage: 'stage', durationMs: 999, success: false });
      expect(mockAddBreadcrumb).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ sessionId: 'sid-xyz', durationMs: 999 }),
        }),
      );
    });
  });
});
