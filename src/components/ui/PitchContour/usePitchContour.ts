// Fetches and exposes stitched session pitch contour data for results UI
import { useEffect, useState } from 'react';
import { z } from 'zod';
import type { ContourData } from '@/lib/praat/praat.types';
import type { PitchContourState } from '@/components/ui/PitchContour/PitchContour.types';

const PitchResponseSchema = z.object({
  contour: z
    .object({
      frameMs: z.number(),
      f0Hz: z.array(z.number()),
      intensityDb: z.array(z.number()),
      voiced: z.array(z.boolean()),
      durationMs: z.number(),
    })
    .nullable(),
});

export function usePitchContour(sessionId: string): PitchContourState {
  const [state, setState] = useState<PitchContourState>({ status: 'idle' });

  useEffect(() => {
    if (!sessionId) {
      return;
    }

    let cancelled = false;

    async function fetchPitchContour() {
      setState({ status: 'loading' });
      try {
        const response = await fetch(`/api/sessions/${sessionId}/pitch`);
        if (!response.ok) {
          if (!cancelled) {
            setState({ status: 'error' });
          }
          return;
        }

        const json: unknown = await response.json();
        const parsed = PitchResponseSchema.safeParse(json);
        if (!parsed.success || parsed.data.contour === null) {
          if (!cancelled) {
            setState({ status: 'empty' });
          }
          return;
        }

        const contour: ContourData = parsed.data.contour;
        if (!cancelled) {
          setState({ status: 'ready', contour });
        }
      } catch {
        if (!cancelled) {
          setState({ status: 'error' });
        }
      }
    }

    void fetchPitchContour();

    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  if (!sessionId) {
    return { status: 'idle' };
  }

  return state;
}
