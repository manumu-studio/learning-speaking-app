// /fluency-training/new — creates a new fluency session and redirects to it
'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { z } from 'zod';
import { Container } from '@/components/ui/Container';

export default function NewFluencySessionPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const promptId = searchParams.get('promptId');
  const [error, setError] = useState<string | null>(
    promptId ? null : 'No prompt selected',
  );

  useEffect(() => {
    if (!promptId) return;

    let cancelled = false;

    async function createSession() {
      try {
        const res = await fetch('/api/fluency-sessions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ promptId }),
        });

        if (cancelled) return;

        if (!res.ok) {
          const data: Record<string, unknown> | null = await res.json().catch(() => null);
          const msg = typeof data?.error === 'string' ? data.error : 'Failed to create session';
          setError(msg);
          return;
        }

        const json: unknown = await res.json();
        const session = z.object({ id: z.string() }).parse(json);
        if (!cancelled) {
          router.replace(`/fluency-training/${session.id}`);
        }
      } catch {
        if (!cancelled) setError('Failed to create session');
      }
    }

    createSession();
    return () => { cancelled = true; };
  }, [promptId, router]);

  if (error) {
    return (
      <Container>
        <div className="py-12 text-center">
          <p className="text-gray-500 dark:text-gray-400">{error}</p>
          <button
            onClick={() => router.push('/fluency-training')}
            className="mt-4 text-sm font-medium text-blue-600 dark:text-blue-400"
          >
            Back to Fluency Training
          </button>
        </div>
      </Container>
    );
  }

  return (
    <Container>
      <div className="flex flex-col items-center gap-4 py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Setting up your 4-3-2 session...
        </p>
      </div>
    </Container>
  );
}
