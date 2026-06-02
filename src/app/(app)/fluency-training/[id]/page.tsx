// /fluency-training/[id] — active fluency session (recording or comparison view)
'use client';
/* eslint-disable max-lines-per-function */

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { z } from 'zod';
import { Container } from '@/components/ui/Container';
import { TimedRecording } from '@/features/fluency/TimedRecording';
import { FluencyComparison } from '@/features/fluency/FluencyComparison';

const RoundDataSchema = z.object({
  roundNumber: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  targetMinutes: z.union([z.literal(4), z.literal(3), z.literal(2)]),
  speechRateWpm: z.number().nullable(),
  fillerCount: z.number().nullable(),
  hesitationCount: z.number().nullable(),
});

const SessionDetailSchema = z.object({
  id: z.string(),
  promptTitle: z.string(),
  promptText: z.string(),
  status: z.enum(['IN_PROGRESS', 'COMPLETED', 'ABANDONED']),
  rounds: z.array(RoundDataSchema),
});

type SessionDetail = z.infer<typeof SessionDetailSchema>;

export default function FluencySessionPage() {
  const params = useParams();
  const router = useRouter();
  const rawId = params.id;
  const sessionId = Array.isArray(rawId) ? rawId[0] ?? '' : rawId ?? '';
  const [session, setSession] = useState<SessionDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSession = useCallback(async () => {
    try {
      const res = await fetch(`/api/fluency-sessions/${sessionId}`);
      if (!res.ok) {
        setError(res.status === 404 ? 'Session not found' : 'Failed to load session');
        return;
      }
      const json: unknown = await res.json();
      const data = SessionDetailSchema.parse(json);
      setSession(data);
    } catch {
      setError('Failed to load session');
    } finally {
      setIsLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    fetchSession();
  }, [fetchSession]);

  const handleAllRoundsComplete = useCallback(() => {
    fetchSession();
  }, [fetchSession]);

  if (isLoading) {
    return (
      <Container>
        <div className="flex flex-col gap-4 animate-pulse py-12">
          <div className="h-8 w-64 rounded bg-gray-200 dark:bg-gray-800" />
          <div className="h-4 w-48 rounded bg-gray-200 dark:bg-gray-800" />
          <div className="h-64 rounded-xl bg-gray-200 dark:bg-gray-800" />
        </div>
      </Container>
    );
  }

  if (error || !session) {
    return (
      <Container>
        <div className="py-12 text-center">
          <p className="text-gray-500 dark:text-gray-400">{error ?? 'Session not found'}</p>
          <button
            onClick={() => router.push('/fluency-training')}
            className="mt-4 text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400"
          >
            Back to Fluency Training
          </button>
        </div>
      </Container>
    );
  }

  const completedRounds = session.rounds.map((r) => ({
    roundNumber: r.roundNumber,
    speechRateWpm: r.speechRateWpm,
    fillerCount: r.fillerCount,
    hesitationCount: r.hesitationCount,
  }));

  return (
    <Container>
      {session.status === 'COMPLETED' ? (
        <FluencyComparison
          fluencySessionId={session.id}
          promptTitle={session.promptTitle}
          rounds={session.rounds}
        />
      ) : (
        <TimedRecording
          fluencySessionId={session.id}
          promptTitle={session.promptTitle}
          promptText={session.promptText}
          completedRounds={completedRounds}
          onAllRoundsComplete={handleAllRoundsComplete}
        />
      )}
    </Container>
  );
}
