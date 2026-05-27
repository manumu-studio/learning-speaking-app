// Hook for PersonalRecordBanner — manages fetch and stagger timing
import { useEffect, useState } from 'react';
import { z } from 'zod';
import type { PersonalRecord } from '@/lib/personalRecords.types';

const PersonalRecordsResponseSchema = z.object({
  personalRecords: z.array(
    z.object({
      metricKey: z.enum([
        'connectorRepetition',
        'structuralVariety',
        'vocabularyPrecision',
        'verbAccuracy',
        'argumentClosure',
        'fillerUsage',
        'pronunciationAccuracy',
        'prosodyScore',
        'speakingRate',
      ]),
      metricLabel: z.string(),
      score: z.number(),
      timeframe: z.enum(['14-day', '30-day', 'all-time']),
      previousBest: z.number().nullable(),
      sessionDate: z.string(),
    }),
  ),
});

interface UsePersonalRecordBannerParams {
  sessionId: string;
  isDone: boolean;
}

interface UsePersonalRecordBannerReturn {
  personalRecords: PersonalRecord[];
  isLoading: boolean;
}

export function usePersonalRecordBanner({
  sessionId,
  isDone,
}: UsePersonalRecordBannerParams): UsePersonalRecordBannerReturn {
  const [personalRecords, setPersonalRecords] = useState<PersonalRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!isDone) {
      return;
    }

    let cancelled = false;

    async function fetchPersonalRecords() {
      setIsLoading(true);
      try {
        const response = await fetch(`/api/sessions/${sessionId}/personal-records`);
        if (!response.ok) {
          return;
        }
        const json: unknown = await response.json();
        const parsed = PersonalRecordsResponseSchema.parse(json);
        if (!cancelled) {
          setPersonalRecords(parsed.personalRecords);
        }
      } catch {
        if (!cancelled) {
          setPersonalRecords([]);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void fetchPersonalRecords();

    return () => {
      cancelled = true;
    };
  }, [sessionId, isDone]);

  return { personalRecords, isLoading };
}
