// Structured pipeline stage timing — logs duration + Sentry breadcrumbs for each stage
import * as Sentry from '@sentry/nextjs';
import { logger } from '@/lib/logger';

interface PipelineStageOptions {
  sessionId: string;
  stage: string;
  durationMs: number;
  success: boolean;
  metadata?: Record<string, unknown>;
}

/**
 * Logs a pipeline stage result to Pino and adds a Sentry breadcrumb for timeline tracing.
 *
 * The Pino log is emitted at `info` level with `event: 'pipeline.stage'` and the
 * Sentry breadcrumb category is `'pipeline'` so all stages appear in the Sentry
 * issue timeline in order.
 *
 * @param options - Stage metadata: `sessionId`, `stage` name, `durationMs`, `success` flag, and optional `metadata`.
 */
export function logPipelineStage(options: PipelineStageOptions): void {
  const { sessionId, stage, durationMs, success, metadata } = options;

  logger.info(
    { event: 'pipeline.stage', sessionId, stage, durationMs, success, ...metadata },
    `Pipeline ${stage} ${success ? 'completed' : 'failed'} in ${durationMs}ms`,
  );

  Sentry.addBreadcrumb({
    category: 'pipeline',
    message: stage,
    level: success ? 'info' : 'error',
    data: { sessionId, durationMs, success },
  });
}
