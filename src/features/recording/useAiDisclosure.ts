// Custom hook — fetches AI disclosure consent status and provides acceptDisclosure action
'use client';

import { useState, useEffect, useCallback } from 'react';
import { z } from 'zod';

type AiDisclosureState =
  | { status: 'loading' }
  | { status: 'accepted' }
  | { status: 'pending' }
  | { status: 'error'; message: string };

const AiDisclosureStatusSchema = z.object({ accepted: z.boolean() });

export function useAiDisclosure(): {
  state: AiDisclosureState;
  acceptDisclosure: () => Promise<void>;
} {
  const [state, setState] = useState<AiDisclosureState>({ status: 'loading' });

  useEffect(() => {
    let cancelled = false;
    async function checkConsent() {
      try {
        const res = await fetch('/api/consent/ai-disclosure');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const parsed = AiDisclosureStatusSchema.parse(await res.json());
        if (!cancelled) {
          setState(parsed.accepted ? { status: 'accepted' } : { status: 'pending' });
        }
      } catch (err) {
        if (!cancelled) {
          setState({
            status: 'error',
            message: err instanceof Error ? err.message : 'Failed to check consent',
          });
        }
      }
    }
    void checkConsent();
    return () => {
      cancelled = true;
    };
  }, []);

  const acceptDisclosure = useCallback(async () => {
    try {
      const res = await fetch('/api/consent/ai-disclosure', { method: 'POST' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const parsed = AiDisclosureStatusSchema.parse(await res.json());
      if (parsed.accepted) {
        setState({ status: 'accepted' });
      }
    } catch (err) {
      setState({
        status: 'error',
        message: err instanceof Error ? err.message : 'Failed to record consent',
      });
    }
  }, []);

  return { state, acceptDisclosure };
}
