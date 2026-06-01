// useTrends — fetch hook for time-series metric data with range control
/* eslint-disable react-hooks/set-state-in-effect */
'use client';

import { useState, useEffect } from 'react';
import { PILLAR_CONFIG } from '@/features/dashboard/pillars';
import type { PillarKey } from '@/features/dashboard/pillars';
import type { MetricKey } from '@/features/dashboard/dashboard.types';
import type { TrendDataItem } from '@/components/ui/TrendChart';
import {
  TrendsResponseSchema,
  type TimeRange,
  type TrendsState,
  type PillarTrendSeries,
  type MetricTrendSeries,
  type TrendsResponse,
} from './trends.types';

// ---------------------------------------------------------------------------
// Metric display labels
// ---------------------------------------------------------------------------

const METRIC_LABELS: Record<string, string> = {
  connectorRepetition: 'Connector Variety',
  structuralVariety: 'Sentence Structure',
  vocabularyPrecision: 'Vocabulary Precision',
  verbAccuracy: 'Verb Accuracy',
  argumentClosure: 'Argument Closure',
  fillerUsage: 'Filler Words',
  lexicalSophistication: 'Lexical Sophistication',
  registerPragmatics: 'Register & Pragmatics',
  pronunciationAccuracy: 'Pronunciation',
  prosodyScore: 'Prosody',
  speakingRate: 'Speaking Rate',
};

// ---------------------------------------------------------------------------
// Pillar color hex values (aligned with TrendChart expectations)
// ---------------------------------------------------------------------------

const PILLAR_COLOR_MAP: Record<PillarKey, string> = {
  delivery: '#3b82f6',
  language: '#8b5cf6',
  pronunciation: '#10b981',
};

// ---------------------------------------------------------------------------
// Transform API response into chart-ready pillar series
// ---------------------------------------------------------------------------

function computePillarSeries(data: TrendsResponse): PillarTrendSeries[] {
  return data.pillarTrends.map((pillarTrend) => {
    const pillarKey: PillarKey = pillarTrend.pillarKey;
    const config = PILLAR_CONFIG[pillarKey];

    // Pillar-level series: aggregate dataPoints → TrendDataItem[]
    const series: TrendDataItem[] = pillarTrend.dataPoints.map((dp) => ({
      date: dp.date,
      value: dp.averageScore,
    }));

    // Per-metric series from the raw dataPoints
    const metricSeries: MetricTrendSeries[] = config.metricKeys.map(
      (metricKey: MetricKey) => {
        const metricItems: TrendDataItem[] = data.dataPoints
          .filter((dp) => dp.scores[metricKey] !== undefined)
          .map((dp) => ({
            date: dp.date,
            value: dp.scores[metricKey] ?? 0,
          }));

        return {
          metricKey,
          label: METRIC_LABELS[metricKey] ?? metricKey,
          series: metricItems,
        };
      },
    );

    return {
      pillarKey,
      label: pillarTrend.label,
      color: PILLAR_COLOR_MAP[pillarKey] ?? '#3b82f6',
      series,
      deltaPercent: pillarTrend.deltaPercent,
      metricSeries,
    };
  });
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useTrends() {
  const [range, setRange] = useState<TimeRange>('30d');
  const [state, setState] = useState<TrendsState>({ status: 'idle' });

  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;

    setState({ status: 'loading' });

    async function load(signal: AbortSignal) {
      try {
        const response = await fetch(`/api/metrics/trends?range=${range}`, { signal });
        if (cancelled) return;

        if (!response.ok) {
          const errorBody: unknown = await response.json().catch(() => null);
          let message = `Request failed (${String(response.status)})`;
          if (
            typeof errorBody === 'object' &&
            errorBody !== null &&
            'error' in errorBody
          ) {
            const errorValue = (errorBody as { error: unknown }).error;
            if (typeof errorValue === 'string') {
              message = errorValue;
            }
          }
          setState({ status: 'error', message });
          return;
        }

        const json: unknown = await response.json();
        const parsed = TrendsResponseSchema.parse(json);
        const pillarSeries = computePillarSeries(parsed);

        if (!cancelled) {
          setState({ status: 'success', pillarSeries });
        }
      } catch (err: unknown) {
        if (cancelled) return;
        if (err instanceof DOMException && err.name === 'AbortError') return;

        const message =
          err instanceof Error ? err.message : 'An unexpected error occurred';
        setState({ status: 'error', message });
      }
    }

    void load(controller.signal);

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [range]);

  return { range, setRange, state } as const;
}
