// useDrillHistory — fetches drill history and stats from API
'use client';

import { useCallback, useEffect, useState } from 'react';

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

function parseDrillItem(raw: unknown): DrillHistoryItem | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  if (typeof o.id !== 'string' || typeof o.drillType !== 'string') return null;
  if (!isDrillType(o.drillType)) return null;
  if (typeof o.metricKey !== 'string' || typeof o.metricLabel !== 'string') return null;
  if (typeof o.createdAt !== 'string') return null;
  const improved: boolean | null =
    o.improved === true ? true : o.improved === false ? false : null;
  const completedAt =
    o.completedAt === null || o.completedAt === undefined
      ? null
      : typeof o.completedAt === 'string'
        ? o.completedAt
        : null;
  return {
    id: o.id,
    drillType: o.drillType,
    metricKey: o.metricKey,
    metricLabel: o.metricLabel,
    improved,
    completedAt,
    createdAt: o.createdAt,
  };
}

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
      if (!data || typeof data !== 'object') throw new Error('Invalid response');
      const record = data as Record<string, unknown>;

      const rawDrills = record.drills;
      const rawStats = record.stats;
      if (!Array.isArray(rawDrills) || !rawStats || typeof rawStats !== 'object') {
        throw new Error('Invalid response');
      }
      const s = rawStats as Record<string, unknown>;
      const totalCompleted = typeof s.totalCompleted === 'number' ? s.totalCompleted : 0;
      const weeklyCompleted = typeof s.weeklyCompleted === 'number' ? s.weeklyCompleted : 0;
      const improvementRate = typeof s.improvementRate === 'number' ? s.improvementRate : 0;

      const parsed = rawDrills
        .map(parseDrillItem)
        .filter((d): d is DrillHistoryItem => d !== null);

      setDrills(parsed);
      setStats({ totalCompleted, weeklyCompleted, improvementRate });
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
