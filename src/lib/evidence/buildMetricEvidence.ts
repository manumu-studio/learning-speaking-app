// Builds MetricEvidence from MetricSnapshot rows for a session
import { prisma } from '@/lib/prisma';
import type { MetricEvidence } from './evidence.types';

export async function buildMetricEvidence(sessionId: string): Promise<MetricEvidence[]> {
  const snapshots = await prisma.metricSnapshot.findMany({
    where: { sessionId },
    orderBy: { createdAt: 'asc' },
  });

  return snapshots.map((snapshot) => ({
    ref: {
      source: 'metric_snapshot' as const,
      table: 'MetricSnapshot',
      rowId: snapshot.id,
      field: 'score',
    },
    label: `${snapshot.key} (${snapshot.level})`,
    rawValue: snapshot.score,
    displayValue: `${snapshot.score}/10`,
    timestamp: snapshot.createdAt.toISOString(),
    sessionId,
    metricKey: snapshot.key,
    normalizedScore: snapshot.score,
    previousScore: null,
    delta: null,
  }));
}
