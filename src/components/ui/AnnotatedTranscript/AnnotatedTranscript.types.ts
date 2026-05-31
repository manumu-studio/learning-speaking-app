// Type definitions for the AnnotatedTranscript component

import type { SessionMetricSnapshot } from '@/features/session/useSessionStatus.types';

/** Minimal insight shape needed by AnnotatedTranscript */
export interface SessionInsight {
  id: string;
  category: string;
  pattern: string;
  suggestion: string | null;
  examples: string[] | null;
}

export interface AnnotatedTranscriptProps {
  /** Full transcript text */
  text: string;
  /** Word count for the header badge */
  wordCount: number | null;
  /** Insights from session.insights — used to compute annotations */
  insights: SessionInsight[];
  /** Metric snapshots from session.metrics — used for pin color variant */
  metrics: SessionMetricSnapshot[];
  /**
   * When set, sentences that have an annotation for this metric key are
   * highlighted with a subtle background.
   */
  highlightedMetricKey?: string | null | undefined;
  /** Animation delay in ms for entrance */
  animationDelay?: number | undefined;
  /** When true, renders content only — parent provides collapsible wrapper */
  embedded?: boolean | undefined;
}
