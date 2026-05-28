// Hook: computes sentence split + annotation map for AnnotatedTranscript
'use client';

import React from 'react';
import { splitSentences } from '@/lib/text/splitSentences';
import { matchInsightsToSentences } from '@/lib/text/matchInsightsToSentences';
import type { AnnotationMap } from '@/lib/text/annotationTypes';
import type { TranscriptSentence } from '@/lib/text/splitSentences';
import type { SessionInsight } from './AnnotatedTranscript.types';
import type { SessionMetricSnapshot } from '@/features/session/useSessionStatus.types';

interface UseAnnotatedTranscriptReturn {
  sentences: TranscriptSentence[];
  annotationMap: AnnotationMap;
  isExpanded: boolean;
  toggle: () => void;
}

export function useAnnotatedTranscript(
  text: string,
  insights: SessionInsight[],
  metrics: SessionMetricSnapshot[],
): UseAnnotatedTranscriptReturn {
  const [isExpanded, setIsExpanded] = React.useState(false);

  const sentences = React.useMemo(() => splitSentences(text), [text]);

  const annotationMap = React.useMemo(
    () => matchInsightsToSentences(insights, sentences, metrics),
    [insights, sentences, metrics],
  );

  const toggle = React.useCallback(() => setIsExpanded((prev) => !prev), []);

  return { sentences, annotationMap, isExpanded, toggle };
}
