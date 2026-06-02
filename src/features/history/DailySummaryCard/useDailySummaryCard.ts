// Hook for lazy-loading a daily summary from the API
import { useEffect, useState } from 'react';
import { z } from 'zod';
import type { DailySummaryData } from './DailySummaryCard.types';

const DailySummarySchema = z.object({
  date: z.string(),
  deliveryAvg: z.number(),
  languageAvg: z.number(),
  pronunciationAvg: z.number(),
  newWords: z.array(z.string()),
  feedback: z.string(),
  sessionCount: z.number(),
});

export function useDailySummaryCard(dateKey: string) {
  const [summary, setSummary] = useState<DailySummaryData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchSummary() {
      setIsLoading(true);
      setError(null);

      try {
        const res = await fetch(`/api/users/me/daily-summaries?date=${dateKey}`);
        if (!res.ok) {
          if (res.status === 404) {
            setIsLoading(false);
            return;
          }
          throw new Error(`Failed to load summary (${res.status})`);
        }

        const json: unknown = await res.json();
        const parsed = DailySummarySchema.parse(json);
        if (!cancelled) {
          setSummary(parsed);
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
    return () => { cancelled = true; };
  }, [dateKey]);

  return { summary, isLoading, error };
}
