// Hook for polling session status until processing completes
import { useState, useEffect, useCallback } from 'react';
import { z } from 'zod';
import type { SessionDetail, UseSessionStatusReturn } from '@/features/session/useSessionStatus.types';

const sessionDetailSchema = z.object({
  id: z.string(),
  status: z.enum(['CREATED', 'UPLOADED', 'CHUNKS_PROCESSING', 'TRANSCRIBING', 'SCORING', 'ANALYZING', 'DONE', 'FAILED']),
  durationSecs: z.number().nullable(),
  isChunked: z.boolean().optional(),
  chunkCount: z.number().nullable().optional(),
  topic: z.string().nullable(),
  focusNext: z.string().nullable(),
  summary: z.string().nullable(),
  errorMessage: z.string().nullable(),
  focusMetricKey: z.string().nullable(),
  createdAt: z.string(),
  transcript: z.object({
    text: z.string(),
    wordCount: z.number().nullable(),
  }).nullable().optional(),
  insights: z.array(z.object({
    id: z.string(),
    category: z.string(),
    pattern: z.string(),
    detail: z.string(),
    frequency: z.number().nullable(),
    severity: z.string().nullable(),
    examples: z.array(z.string()).nullable(),
    suggestion: z.string().nullable(),
  })),
  metrics: z.array(z.object({
    id: z.string(),
    key: z.string(),
    level: z.string(),
    score: z.number(),
    note: z.string().nullable(),
    createdAt: z.string(),
  })).nullable().optional(),
  workoutNumber: z.number().optional(),
  pronunciationReport: z.object({
    pronScore: z.number(),
    accuracyScore: z.number(),
    fluencyScore: z.number(),
    completenessScore: z.number(),
    prosodyScore: z.number(),
    speakingRateWpm: z.number(),
    failureReason: z.string().nullable(),
    words: z.array(
      z.object({
        word: z.string(),
        accuracyScore: z.number(),
        errorType: z.string(),
        offsetMs: z.number(),
        durationMs: z.number(),
        phonemes: z.unknown(),
        l1Tags: z.array(z.string()),
        breakErrorTypes: z.array(z.string()),
        intonationErrorTypes: z.array(z.string()),
        monotonePitchDelta: z.number().nullable(),
      }),
    ),
  })
    .nullable()
    .optional(),
  chunks: z.array(z.object({
    chunkIndex: z.number(),
    durationSecs: z.number(),
    transcriptText: z.string().nullable(),
    wordCount: z.number().nullable(),
    accuracyScore: z.number().nullable(),
    fluencyScore: z.number().nullable(),
    prosodyScore: z.number().nullable(),
    pronScore: z.number().nullable(),
    status: z.string(),
  })).optional(),
}).transform((val): SessionDetail => {
  const result: SessionDetail = {
    id: val.id,
    status: val.status,
    durationSecs: val.durationSecs,
    topic: val.topic,
    focusNext: val.focusNext,
    summary: val.summary,
    errorMessage: val.errorMessage,
    focusMetricKey: val.focusMetricKey,
    createdAt: val.createdAt,
    insights: val.insights,
  };
  if (val.transcript != null) {
    result.transcript = val.transcript;
  }
  if (val.metrics != null) {
    result.metrics = val.metrics;
  }
  if (val.pronunciationReport !== undefined) {
    result.pronunciationReport = val.pronunciationReport;
  }
  if (val.workoutNumber !== undefined) {
    result.workoutNumber = val.workoutNumber;
  }
  if (val.isChunked !== undefined) {
    result.isChunked = val.isChunked;
  }
  if (val.chunkCount !== undefined) {
    result.chunkCount = val.chunkCount;
  }
  if (val.chunks !== undefined) {
    result.chunks = val.chunks;
  }
  return result;
});

const POLL_INTERVAL_FAST = 3000;
const POLL_INTERVAL_SLOW = 10000;
const FAST_POLL_DURATION = 30000;
const MAX_POLL_DURATION = 300000;

const PROCESSING_STATUSES = ['CREATED', 'UPLOADED', 'CHUNKS_PROCESSING', 'TRANSCRIBING', 'SCORING', 'ANALYZING'] as const;

export function useSessionStatus(sessionId: string): UseSessionStatusReturn {
  const [session, setSession] = useState<SessionDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pollStartTime] = useState(Date.now());

  const fetchSession = useCallback(async () => {
    try {
      const response = await fetch(`/api/sessions/${sessionId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch session');
      }
      const data = sessionDetailSchema.parse(await response.json());
      setSession(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, [sessionId]);

  const retry = useCallback(() => {
    setIsLoading(true);
    setError(null);
    fetchSession();
  }, [fetchSession]);

  useEffect(() => {
    fetchSession();
  }, [fetchSession]);

  useEffect(() => {
    if (!session) return;

    const isProcessing = (PROCESSING_STATUSES as readonly string[]).includes(session.status);
    if (!isProcessing) return;

    const elapsed = Date.now() - pollStartTime;
    if (elapsed > MAX_POLL_DURATION) {
      setError('Processing is taking longer than expected. Please check back later.');
      return;
    }

    const interval = elapsed < FAST_POLL_DURATION ? POLL_INTERVAL_FAST : POLL_INTERVAL_SLOW;
    const timer = setInterval(fetchSession, interval);
    return () => clearInterval(timer);
  }, [session, fetchSession, pollStartTime]);

  return {
    session,
    isLoading,
    isProcessing: session !== null && (PROCESSING_STATUSES as readonly string[]).includes(session.status),
    isDone: session?.status === 'DONE',
    isFailed: session?.status === 'FAILED',
    error,
    retry,
  };
}
