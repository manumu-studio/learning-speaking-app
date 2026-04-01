// useDrillHistory — fetches drill history and stats from API
'use client';

import { useCallback, useEffect, useState } from 'react';
import { z } from 'zod';

const VALID_DRILL_TYPES = [
  'rephrase',
  'constraint',
  'vocabUpgrade',
  'precision',
  'conclusion',
] as const;

type DrillType = (typeof VALID_DRILL_TYPES)[number];

function isDrillType(value: string): value is DrillType {
  return (VALID_DRILL_TYPES as readonly string[]).includes(value);
}

export interface DrillHistoryItem {
  id: string;
  drillType: DrillType;
  metricKey: string;
  metricLabel: string;
  improved: boolean | null;
  completedAt: string | null;
  createdAt: string;
}

export interface DrillHistoryStats {
  totalCompleted: number;
  weeklyCompleted: number;
  improvementRate: number;
}

interface UseDrillHistoryReturn {
  drills: DrillHistoryItem[];
  stats: DrillHistoryStats;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

// Zod schemas for API response validation
const drillHistoryItemSchema = z.object({
  id: z.string(),
  drillType: z.string().refine(isDrillType),
  metricKey: z.string(),
  metricLabel: z.string(),
  improved: z.boolean().nullable(),
  completedAt: z.string().nullable(),
  createdAt: z.string(),
});

const drillHistoryResponseSchema = z.object({
  drills: z.array(drillHistoryItemSchema),
  stats: z.object({
    totalCompleted: z.number(),
    weeklyCompleted: z.number(),
    improvementRate: z.number(),
  }),
});

export function useDrillHistory(): UseDrillHistoryReturn {
  const [drills, setDrills] = useState<DrillHistoryItem[]>([]);
  const [stats, setStats] = useState<DrillHistoryStats>({
    totalCompleted: 0,
    weeklyCompleted: 0,
    improvementRate: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHistory = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await fetch('/api/drills');
      if (!res.ok) throw new Error('Failed to load drill history');

      const data: unknown = await res.json();
      const result = drillHistoryResponseSchema.safeParse(data);
      if (!result.success) throw new Error('Invalid response');

      setDrills(result.data.drills);
      setStats(result.data.stats);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchHistory();
  }, [fetchHistory]);

  return { drills, stats, isLoading, error, refetch: fetchHistory };
}
