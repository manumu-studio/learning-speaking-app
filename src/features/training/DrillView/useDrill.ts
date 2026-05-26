// useDrill — manages drill lifecycle state machine and API interactions
'use client';

import { useCallback, useEffect, useState } from 'react';
import { z } from 'zod';
import { InsightExamplesSchema } from '@/lib/schemas/jsonFields';
import type { DrillType } from '@/features/training/training.types';

type DrillState = 'prompt' | 'recording' | 'processing' | 'feedback';

const DRILL_TIME_LIMIT_SECONDS: Record<DrillType, number> = {
  rephrase: 90,
  constraint: 120,
  vocabUpgrade: 60,
  precision: 60,
  conclusion: 120,
  pronunciation: 90,
};

const DRILL_TYPES: readonly DrillType[] = [
  'rephrase',
  'constraint',
  'vocabUpgrade',
  'precision',
  'conclusion',
  'pronunciation',
];

const METRIC_LABELS: Record<string, string> = {
  connectorRepetition: 'Connector Repetition',
  structuralVariety: 'Structural Variety',
  vocabularyPrecision: 'Vocabulary Precision',
  verbAccuracy: 'Verb Accuracy',
  argumentClosure: 'Argument Closure',
  fillerUsage: 'Filler Usage',
  pronunciationAccuracy: 'Pronunciation Accuracy',
  prosodyScore: 'Prosody Score',
  speakingRate: 'Speaking Rate',
};

function isDrillType(value: string): value is DrillType {
  return (DRILL_TYPES as readonly string[]).includes(value);
}

export interface DrillData {
  id: string;
  sessionId: string | null;
  drillType: DrillType;
  prompt: string;
  sourceExample: string | null;
  timeLimit: number;
  metricKey: string;
  metricLabel: string;
}

export interface DrillFeedbackData {
  feedback: string;
  improved: boolean;
}

export interface UseDrillReturn {
  state: DrillState;
  drill: DrillData | null;
  feedback: DrillFeedbackData | null;
  error: string | null;
  isLoading: boolean;
  startRecording: () => void;
  stopRecording: (audioBlob: Blob) => Promise<void>;
  tryAgain: () => Promise<string | null>;
}

// Zod schemas for API response validation
const drillResponseSchema = z.object({
  id: z.string(),
  sessionId: z.string().nullable().optional(),
  drillType: z.string().refine(isDrillType),
  prompt: z.string(),
  sourceExample: z.string().nullable().optional(),
  metricKey: z.string(),
  completedAt: z.string().nullable().optional(),
  feedback: z.string().optional(),
  improved: z.boolean().optional(),
});

const drillCompleteResponseSchema = z.object({
  feedback: z.string(),
  improved: z.boolean().optional(),
});

const sessionForDrillSchema = z.object({
  focusNext: z.string().nullable(),
  intentLabel: z.string().nullable().optional(),
  transcript: z.object({ text: z.string() }).optional(),
  insights: z.array(z.object({
    pattern: z.string(),
    examples: z.unknown(),
  })),
});

interface SessionForDrillPayload {
  focusNext: string | null;
  intentLabel?: string | null | undefined;
  transcript?: { text: string } | undefined;
  insights: Array<{ pattern: string; examples: unknown }>;
}

function buildRecentExamples(session: SessionForDrillPayload): string[] {
  const fromInsights = session.insights
    .flatMap((i) => {
      const parsed = InsightExamplesSchema.safeParse(i.examples);
      return parsed.success ? parsed.data : [];
    })
    .slice(0, 5);
  if (fromInsights.length > 0) return fromInsights;
  const t = session.transcript?.text?.trim();
  if (t && t.length > 0) return [t.slice(0, Math.min(t.length, 600))];
  return ['General speaking practice'];
}

function focusPatternFromSession(session: SessionForDrillPayload): string {
  if (session.focusNext?.trim()) return session.focusNext.trim();
  const first = session.insights[0];
  if (first?.pattern?.trim()) return first.pattern.trim();
  return 'Clear, structured English delivery';
}

function parseDrillJson(raw: z.infer<typeof drillResponseSchema>): DrillData | null {
  const sourceExample = raw.sourceExample ?? null;
  const sessionId = raw.sessionId ?? null;
  const timeLimit = DRILL_TIME_LIMIT_SECONDS[raw.drillType];
  const metricLabel = METRIC_LABELS[raw.metricKey] ?? raw.metricKey;
  return {
    id: raw.id,
    sessionId,
    drillType: raw.drillType,
    prompt: raw.prompt,
    sourceExample,
    timeLimit,
    metricKey: raw.metricKey,
    metricLabel,
  };
}

export function useDrill(drillId: string): UseDrillReturn {
  const [state, setState] = useState<DrillState>('prompt');
  const [drill, setDrill] = useState<DrillData | null>(null);
  const [feedback, setFeedback] = useState<DrillFeedbackData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchDrill() {
      try {
        setIsLoading(true);
        setError(null);
        const res = await fetch(`/api/drills/${drillId}`);
        if (!res.ok) throw new Error('Failed to load drill');
        const raw: unknown = await res.json();
        const drillResult = drillResponseSchema.safeParse(raw);
        if (!drillResult.success) throw new Error('Invalid drill response');
        const drillData = drillResult.data;
        const parsed = parseDrillJson(drillData);
        if (!parsed) throw new Error('Invalid drill response');
        setDrill(parsed);

        const completedAt = drillData.completedAt;
        const feedbackText = drillData.feedback;
        const improvedVal = drillData.improved;
        if (
          completedAt !== null &&
          completedAt !== undefined &&
          typeof feedbackText === 'string' &&
          feedbackText.length > 0
        ) {
          setFeedback({
            feedback: feedbackText,
            improved: improvedVal === true,
          });
          setState('feedback');
        } else {
          setState('prompt');
          setFeedback(null);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setIsLoading(false);
      }
    }
    void fetchDrill();
  }, [drillId]);

  const startRecording = useCallback(() => {
    setState('recording');
  }, []);

  const stopRecording = useCallback(async (audioBlob: Blob) => {
    setState('processing');
    try {
      const formData = new FormData();
      formData.append('audio', audioBlob);

      const res = await fetch(`/api/drills/${drillId}/complete`, {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) throw new Error('Failed to submit drill');

      const result = drillCompleteResponseSchema.parse(await res.json());

      setFeedback({
        feedback: result.feedback,
        improved: result.improved === true,
      });
      setState('feedback');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Submission failed');
      setState('prompt');
    }
  }, [drillId]);

  const tryAgain = useCallback(async (): Promise<string | null> => {
    const current = drill;
    if (!current) return null;
    if (!current.sessionId) {
      setError('Open this drill from session results to try again with a fresh prompt.');
      return null;
    }

    try {
      setError(null);
      const sessionRes = await fetch(`/api/sessions/${current.sessionId}`);
      if (!sessionRes.ok) throw new Error('Failed to load session for retry');

      const sessionParsed = sessionForDrillSchema.safeParse(await sessionRes.json());
      if (!sessionParsed.success) throw new Error('Invalid session');
      const session: SessionForDrillPayload = sessionParsed.data;

      const recentExamples = buildRecentExamples(session);
      const focusPattern = focusPatternFromSession(session);

      const sessionTranscript = session.transcript?.text?.trim();

      const res = await fetch('/api/drills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: current.sessionId,
          drillType: current.drillType,
          metricKey: current.metricKey,
          recentExamples,
          focusPattern,
          intentLabel: session.intentLabel ?? null,
          ...(sessionTranscript && sessionTranscript.length > 0
            ? { sessionTranscript }
            : {}),
        }),
      });

      if (!res.ok) throw new Error('Failed to create new drill');

      const createResult = drillResponseSchema.safeParse(await res.json());
      if (!createResult.success) throw new Error('Invalid drill response');
      const parsed = parseDrillJson(createResult.data);
      if (!parsed) throw new Error('Invalid drill response');

      return parsed.id;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to retry');
      return null;
    }
  }, [drill]);

  return { state, drill, feedback, error, isLoading, startRecording, stopRecording, tryAgain };
}
