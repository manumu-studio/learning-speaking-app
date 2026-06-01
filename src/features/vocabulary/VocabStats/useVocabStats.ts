// Fetch vocabulary statistics
'use client';

import { useState, useEffect } from 'react';
import { VocabStatsDataSchema } from '../vocabulary.schemas';
import type { VocabStatsData } from './VocabStats.types';

export function useVocabStats() {
  const [stats, setStats] = useState<VocabStatsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await fetch('/api/users/me/vocabulary/stats');
        if (!res.ok) return;
        const json: unknown = await res.json();
        const parsed = VocabStatsDataSchema.safeParse(json);
        if (parsed.success) {
          setStats(parsed.data);
        }
      } finally {
        setIsLoading(false);
      }
    }

    void fetchStats();
  }, []);

  return { stats, isLoading };
}
