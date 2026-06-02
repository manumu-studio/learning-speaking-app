// Data-fetching hook for the session results page — manages side effects and derived state
'use client';

import { useEffect, useState } from 'react';
import { PronunciationHistorySchema } from '@/components/ui/PronunciationProgress';
import type { HistoryItem } from '@/components/ui/PronunciationProgress';
import type { VocabItem } from '@/components/ui/VocabProgress';
import { METRIC_LABELS } from '@/features/dashboard/pillars';
import { useSessionStatus } from '@/features/session/useSessionStatus';
import { usePersonalRecordBanner } from '@/components/ui/PersonalRecordBanner';
import { usePitchContour } from '@/components/ui/PitchContour';
import type { FocusComparison } from './sessionResults.helpers';
import { focusComparisonSchema } from './sessionResults.helpers';

function isVocabItem(item: unknown): item is VocabItem {
  return (
    typeof item === 'object' &&
    item !== null &&
    'word' in item &&
    'meaning' in item
  );
}

async function fetchFocusComparison(
  id: string,
  focusKey: string,
): Promise<FocusComparison | null> {
  const response = await fetch(
    `/api/sessions/${id}/focus-comparison?metricKey=${encodeURIComponent(focusKey)}`,
  );
  if (!response.ok) return null;
  const data = focusComparisonSchema.parse(await response.json());
  return {
    metricLabel: METRIC_LABELS[focusKey] ?? focusKey,
    currentScore: data.currentScore,
    previousScore: data.previousScore,
  };
}

async function fetchPronunciationHistory(id: string): Promise<HistoryItem[]> {
  const res = await fetch(`/api/sessions/${id}/pronunciation-history`);
  if (!res.ok) return [];
  const json: unknown = await res.json();
  const parsed = PronunciationHistorySchema.safeParse(json);
  return parsed.success ? parsed.data.history : [];
}

async function fetchVocabItems(): Promise<VocabItem[]> {
  const res = await fetch('/api/users/me/vocabulary');
  if (!res.ok) return [];
  const json: unknown = await res.json();
  return Array.isArray(json) ? json.filter(isVocabItem) : [];
}

export function useSessionPageData(id: string) {
  const { session, isLoading, isProcessing, isDone, isFailed, retry } = useSessionStatus(id);
  const { personalRecords } = usePersonalRecordBanner({ sessionId: id, isDone });
  const [focusComparison, setFocusComparison] = useState<FocusComparison | null>(null);
  const [pronunciationHistory, setPronunciationHistory] = useState<HistoryItem[]>([]);
  const [vocabItems, setVocabItems] = useState<VocabItem[]>([]);
  const [resultsView, setResultsView] = useState<'overall' | 'segments'>('overall');
  const pitchState = usePitchContour(
    session !== null && session.status !== 'FAILED' ? id : '',
  );

  useEffect(() => {
    const focusKey = session?.focusMetricKey;
    if (!focusKey || !isDone) return;
    void fetchFocusComparison(id, focusKey)
      .then((comparison) => { if (comparison) setFocusComparison(comparison); })
      .catch(() => undefined);
  }, [session, isDone, id]);

  useEffect(() => {
    if (!isDone || session?.pronunciationReport === null || session?.pronunciationReport === undefined) {
      return;
    }
    void fetchPronunciationHistory(id)
      .then(setPronunciationHistory)
      .catch(() => undefined);
  }, [id, isDone, session?.pronunciationReport]);

  useEffect(() => {
    if (!isDone) return;
    void fetchVocabItems()
      .then(setVocabItems)
      .catch(() => undefined);
  }, [isDone]);

  return {
    session,
    isLoading,
    isProcessing,
    isDone,
    isFailed,
    retry,
    personalRecords,
    focusComparison,
    pronunciationHistory,
    vocabItems,
    resultsView,
    setResultsView,
    pitchState,
  };
}
