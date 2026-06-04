// Fetches day-detail meta-session data for the day detail view
import { useEffect, useState } from 'react';
import { z } from 'zod';
import { DayDetailDataSchema } from '@/lib/daily/dayDetail/buildDayDetailData.types';
import type { DayDetailData } from '@/lib/daily/dayDetail/buildDayDetailData.types';

const DailyResponseSchema = z.object({
  date: z.string(),
  isClosed: z.boolean(),
  dayDetail: DayDetailDataSchema,
});

export interface DayDetailState {
  data: DayDetailData | null;
  isLoading: boolean;
  error: string | null;
}

export function useDayDetailContent(date: string): DayDetailState {
  const [data, setData] = useState<DayDetailData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchData() {
      setIsLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/daily/${date}`);
        if (!res.ok) {
          throw new Error(res.status === 404 ? 'No completed day found.' : `Failed to load day data (${res.status})`);
        }
        const parsed = DailyResponseSchema.parse(await res.json());
        if (!cancelled) setData(parsed.dayDetail);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load day data');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    void fetchData();
    return () => {
      cancelled = true;
    };
  }, [date]);

  return { data, isLoading, error };
}
