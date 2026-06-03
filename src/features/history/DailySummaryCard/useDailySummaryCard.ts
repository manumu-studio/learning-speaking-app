// Fetches daily conclusion data for a given date
import { useState, useEffect } from 'react';
import { z } from 'zod';
import type { DailyConclusionSummary } from './DailySummaryCard.types';

const SummarySchema = z.object({
  date: z.string(),
  overallScore: z.number(),
  totalDurationSecs: z.number(),
  topicSentence: z.string(),
  sessionCount: z.number(),
  conclusionData: z.object({
    activeTargetsTomorrow: z.array(z.string()),
  }),
});

export function useDailySummaryCard(dateKey: string) {
  const [summary, setSummary] = useState<DailyConclusionSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchSummary() {
      setIsLoading(true);
      setError(null);

      try {
        const res = await fetch(`/api/daily/${dateKey}`);

        if (res.status === 404) {
          if (!cancelled) setIsLoading(false);
          return;
        }
        if (!res.ok) {
          throw new Error(`Failed to load summary (${res.status})`);
        }

        const json: unknown = await res.json();
        const parsed = SummarySchema.parse(json);

        if (!cancelled) {
          setSummary({
            date: parsed.date,
            overallScore: parsed.overallScore,
            totalDurationSecs: parsed.totalDurationSecs,
            topicSentence: parsed.topicSentence,
            sessionCount: parsed.sessionCount,
            activeTargetsTomorrow: parsed.conclusionData.activeTargetsTomorrow,
          });
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load summary');
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void fetchSummary();
    return () => {
      cancelled = true;
    };
  }, [dateKey]);

  return { summary, isLoading, error };
}
