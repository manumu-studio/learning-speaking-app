// Fetches language bank data for the panel
'use client';

import { useState, useEffect } from 'react';
import { z } from 'zod';

// ─── Zod schema ───────────────────────────────────────────────────────────────

const LanguageBankItemSchema = z.object({
  id: z.string(),
  userId: z.string(),
  text: z.string(),
  lemmaOrPattern: z.string().nullable(),
  category: z.string(),
  source: z.string(),
  usageCount: z.number().int().nonnegative(),
  masteryState: z.enum(['emerging', 'developing', 'consolidating', 'mastered']),
  isActiveTarget: z.boolean(),
  firstSuggestedAt: z.string(),
  lastUsedAt: z.string().nullable(),
  lastSuggestedAt: z.string().nullable(),
  nextRetargetAt: z.string().nullable(),
});

const LanguageBankResponseSchema = z.object({
  items: z.array(LanguageBankItemSchema),
  activeTargets: z.array(LanguageBankItemSchema),
});

export type LanguageBankItem = z.infer<typeof LanguageBankItemSchema>;
export type LanguageBankResponse = z.infer<typeof LanguageBankResponseSchema>;

// ─── Return type ──────────────────────────────────────────────────────────────

export interface UseLanguageBankPanelReturn {
  items: LanguageBankItem[];
  activeTargets: LanguageBankItem[];
  isLoading: boolean;
  error: string | null;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useLanguageBankPanel(): UseLanguageBankPanelReturn {
  const [items, setItems] = useState<LanguageBankItem[]>([]);
  const [activeTargets, setActiveTargets] = useState<LanguageBankItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchData() {
      setIsLoading(true);
      setError(null);

      try {
        const res = await fetch('/api/daily/language-bank');
        if (!res.ok) {
          throw new Error(`Failed to load language bank (${res.status})`);
        }
        const json: unknown = await res.json();
        const parsed = LanguageBankResponseSchema.parse(json);
        if (!cancelled) {
          setItems(parsed.items);
          setActiveTargets(parsed.activeTargets);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load language bank');
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
  }, []);

  return { items, activeTargets, isLoading, error };
}
