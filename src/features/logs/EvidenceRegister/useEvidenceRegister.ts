// Data fetching hook for the evidence register
import { useState, useEffect, useCallback } from 'react';
import { z } from 'zod';
import type { EvidenceBundle } from '@/lib/evidence';

const looseArray = z.array(z.object({}).passthrough());

const bundleSchema = z.object({
  entityType: z.enum(['session', 'day']),
  entityId: z.string(),
  metrics: looseArray,
  transcript: looseArray,
  grammar: looseArray,
  pronunciation: looseArray,
  naturalness: looseArray,
  corpus: looseArray,
  pipelineMetadata: z.object({}).passthrough().nullable(),
}).passthrough();

function isEvidenceBundle(value: unknown): value is EvidenceBundle {
  return typeof value === 'object' && value !== null && 'entityType' in value && 'metrics' in value;
}

interface UseEvidenceRegisterReturn {
  bundle: EvidenceBundle | null;
  isLoading: boolean;
  error: string | null;
}

export function useEvidenceRegister(
  apiUrl: string,
): UseEvidenceRegisterReturn {
  const [bundle, setBundle] = useState<EvidenceBundle | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEvidence = useCallback(async () => {
    try {
      const response = await fetch(apiUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch evidence: ${response.status}`);
      }
      const json: unknown = await response.json();
      const parsed = bundleSchema.parse(json);
      if (!isEvidenceBundle(parsed)) throw new Error('Invalid evidence bundle shape');
      setBundle(parsed);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, [apiUrl]);

  useEffect(() => {
    fetchEvidence();
  }, [fetchEvidence]);

  return { bundle, isLoading, error };
}
