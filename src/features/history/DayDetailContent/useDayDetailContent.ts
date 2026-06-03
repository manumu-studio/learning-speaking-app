// Fetches daily conclusion data for the day detail view
import { useState, useEffect } from 'react';
import { z } from 'zod';

// ─── Zod schema ───────────────────────────────────────────────────────────────

const WinSchema = z.object({
  tag: z.string(),
  detail: z.string(),
  evidenceSessionId: z.string(),
});

const StruggleSchema = z.object({
  tag: z.string(),
  detail: z.string(),
  count: z.number().int().nonnegative(),
});

const FocusTomorrowSchema = z.object({
  tag: z.string(),
  reason: z.string(),
});

const ConclusionDataSchema = z.object({
  date: z.string(),
  overallScore: z.number(),
  totalDurationSecs: z.number(),
  topicSentence: z.string(),
  pillarScores: z.object({
    delivery: z.number(),
    language: z.number(),
    pronunciation: z.number(),
  }),
  metricDeltas: z.object({
    delivery: z.number().nullable(),
    language: z.number().nullable(),
    pronunciation: z.number().nullable(),
  }),
  wins: z.array(WinSchema),
  struggles: z.array(StruggleSchema),
  persistentStruggles: z.array(z.object({ tag: z.string(), daysRecurring: z.number() })),
  improvedSinceYesterday: z.array(z.object({ tag: z.string(), yesterdayValue: z.number(), todayValue: z.number() })),
  newVocabSpotted: z.array(z.object({ text: z.string(), category: z.string() })),
  focusTomorrow: z.array(FocusTomorrowSchema),
  activeTargetsTomorrow: z.array(z.string()),
  keyInsights: z.array(z.string()),
  tone: z.literal('supportive_neutral'),
});

const DailyResponseSchema = z.object({
  date: z.string(),
  overallScore: z.number(),
  totalDurationSecs: z.number(),
  topicSentence: z.string(),
  renderedFeedback: z.string(),
  sessionCount: z.number(),
  deliveryAvg: z.number(),
  languageAvg: z.number(),
  pronunciationAvg: z.number(),
  conclusionData: ConclusionDataSchema,
});

export type DailyResponse = z.infer<typeof DailyResponseSchema>;

// ─── State ────────────────────────────────────────────────────────────────────

export interface DayDetailState {
  data: DailyResponse | null;
  isLoading: boolean;
  error: string | null;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useDayDetailContent(date: string): DayDetailState {
  const [data, setData] = useState<DailyResponse | null>(null);
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
          const status = res.status;
          if (status === 404) {
            throw new Error('No sessions found for this date.');
          }
          throw new Error(`Failed to load day data (${status})`);
        }

        const json: unknown = await res.json();
        const parsed = DailyResponseSchema.parse(json);

        if (!cancelled) {
          setData(parsed);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load day data');
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void fetchData();
    return () => {
      cancelled = true;
    };
  }, [date]);

  return { data, isLoading, error };
}
