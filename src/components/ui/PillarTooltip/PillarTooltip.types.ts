// Type definitions for PillarTooltip component

import type { PillarKey } from '@/features/dashboard/pillars';
import type { SessionMetricSnapshot } from '@/features/session/useSessionStatus.types';

export interface PillarTooltipProps {
  pillarKey: PillarKey;
  metrics: SessionMetricSnapshot[];
  isOpen: boolean;
  onClose: () => void;
}

export interface MetricRow {
  key: string;
  label: string;
  score: number;
  isWeakest: boolean;
}

export interface TooltipContent {
  rows: MetricRow[];
  contextSentence: string;
}
