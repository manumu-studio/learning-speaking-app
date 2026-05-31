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
