// Hook for fetching fluency session data, computing round deltas, and polling for pending metrics
'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { z } from 'zod';
import type { FluencyRoundResult, FluencyDeltas } from './FluencyComparison.types';

const POLL_INTERVAL_MS = 5_000;

const fluencyRoundSchema = z.object({
  roundNumber: z.number(),
  targetMinutes: z.number(),
  speechRateWpm: z.number().nullable(),
  fillerCount: z.number().nullable(),
  hesitationCount: z.number().nullable(),
});

const fluencySessionSchema = z.object({
  id: z.string(),
  promptTitle: z.string(),
  rounds: z.array(fluencyRoundSchema),
});

interface UseFluencyComparisonOptions {
  fluencySessionId: string;
  initialRounds: FluencyRoundResult[];
}

interface UseFluencyComparisonReturn {
  rounds: FluencyRoundResult[];
  deltas: FluencyDeltas;
  isProcessing: boolean;
  motivationalMessage: string;
}

/** Computes percentage change, returning null when source values are missing */
function computePercentChange(
  first: number | null,
  last: number | null,
): number | null {
  if (first === null || last === null || first === 0) return null;
  return Math.round(((last - first) / first) * 100);
}

/** Generates an encouraging coaching message based on improvement deltas */
function buildMotivationalMessage(deltas: FluencyDeltas): string {
  const parts: string[] = [];

  if (deltas.wpmChange !== null && deltas.wpmChange > 0) {
    parts.push(`+${deltas.wpmChange}% speech rate — you're building automaticity!`);
  } else if (deltas.wpmChange !== null && deltas.wpmChange === 0) {
    parts.push('Steady speech rate — consistency is a strength.');
  }

  if (deltas.fillerChange !== null && deltas.fillerChange < 0) {
    parts.push(`${deltas.fillerChange}% fewer fillers — smoother delivery.`);
  }

  if (deltas.hesitationChange !== null && deltas.hesitationChange < 0) {
    parts.push(`${deltas.hesitationChange}% fewer pauses — your flow is improving.`);
  }

  if (parts.length === 0) {
    return 'Each round strengthens your fluency. Keep at it — the progress compounds!';
  }

  return parts.join(' ');
}

export function useFluencyComparison({
  fluencySessionId,
  initialRounds,
}: UseFluencyComparisonOptions): UseFluencyComparisonReturn {
  const [rounds, setRounds] = useState<FluencyRoundResult[]>(initialRounds);

  const hasNullMetrics = rounds.some(
    (r) =>
      r.speechRateWpm === null ||
      r.fillerCount === null ||
      r.hesitationCount === null,
  );

  const isProcessing = hasNullMetrics && rounds.length > 0;

  // Poll for updated metrics when any round is still processing
  const fetchRounds = useCallback(
    async (signal: AbortSignal) => {
      try {
        const response = await fetch(
          `/api/fluency-sessions/${fluencySessionId}`,
          { signal },
        );
        if (!response.ok) return;

        const data = fluencySessionSchema.parse(await response.json());

        if (!signal.aborted) {
          setRounds(
            data.rounds.map((r) => ({
              roundNumber: r.roundNumber as 1 | 2 | 3,
              targetMinutes: r.targetMinutes as 4 | 3 | 2,
              speechRateWpm: r.speechRateWpm,
              fillerCount: r.fillerCount,
              hesitationCount: r.hesitationCount,
            })),
          );
        }
      } catch {
        // Non-fatal — polling is best-effort
      }
    },
    [fluencySessionId],
  );

  useEffect(() => {
    if (!isProcessing) return;

    const controller = new AbortController();
    const timer = setInterval(
      () => void fetchRounds(controller.signal),
      POLL_INTERVAL_MS,
    );

    return () => {
      controller.abort();
      clearInterval(timer);
    };
  }, [isProcessing, fetchRounds]);

  // Compute deltas: R3 vs R1
  const deltas = useMemo<FluencyDeltas>(() => {
    const r1 = rounds.find((r) => r.roundNumber === 1);
    const r3 = rounds.find((r) => r.roundNumber === 3);

    if (!r1 || !r3) {
      return { wpmChange: null, fillerChange: null, hesitationChange: null };
    }

    return {
      wpmChange: computePercentChange(r1.speechRateWpm, r3.speechRateWpm),
      fillerChange: computePercentChange(r1.fillerCount, r3.fillerCount),
      hesitationChange: computePercentChange(
        r1.hesitationCount,
        r3.hesitationCount,
      ),
    };
  }, [rounds]);

  const motivationalMessage = useMemo(
    () => buildMotivationalMessage(deltas),
    [deltas],
  );

  return { rounds, deltas, isProcessing, motivationalMessage };
}
