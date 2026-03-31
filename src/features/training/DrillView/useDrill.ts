// useDrill — manages drill lifecycle state machine and API interactions
'use client';

import { useCallback, useEffect, useState } from 'react';
import type { DrillType } from '@/features/training/training.types';

type DrillState = 'prompt' | 'recording' | 'processing' | 'feedback';

const DRILL_TIME_LIMIT_SECONDS: Record<DrillType, number> = {
  rephrase: 90,
  constraint: 120,
  vocabUpgrade: 60,
  precision: 60,
  conclusion: 120,
};

const DRILL_TYPES: readonly DrillType[] = [
  'rephrase',
  'constraint',
  'vocabUpgrade',
  'precision',
  'conclusion',
];

const METRIC_LABELS: Record<string, string> = {
  connectorRepetition: 'Connector Repetition',
  structuralVariety: 'Structural Variety',
  vocabularyPrecision: 'Vocabulary Precision',
  verbAccuracy: 'Verb Accuracy',
  argumentClosure: 'Argument Closure',
  fillerUsage: 'Filler Usage',
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

interface SessionForDrillPayload {
  focusNext: string | null;
  intentLabel?: string | null;
  transcript?: { text: string };
  insights: Array<{ pattern: string; examples: unknown }>;
}

function buildRecentExamples(session: SessionForDrillPayload): string[] {
  const fromInsights = session.insights
    .flatMap((i) => {
      const ex = i.examples;
      if (!Array.isArray(ex)) return [];
      return ex.filter((item): item is string => typeof item === 'string');
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

function parseDrillJson(raw: Record<string, unknown>): DrillData | null {
  if (typeof raw.id !== 'string' || typeof raw.drillType !== 'string' || !isDrillType(raw.drillType)) {
    return null;
  }
  if (typeof raw.prompt !== 'string' || typeof raw.metricKey !== 'string') {
    return null;
  }
  const sourceExample =
    raw.sourceExample === null || raw.sourceExample === undefined
      ? null
      : typeof raw.sourceExample === 'string'
        ? raw.sourceExample
        : null;
  const sessionId =
    raw.sessionId === null || raw.sessionId === undefined
      ? null
      : typeof raw.sessionId === 'string'
        ? raw.sessionId
        : null;
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
        if (!raw || typeof raw !== 'object') throw new Error('Invalid drill response');
        const data = raw as Record<string, unknown>;
        const parsed = parseDrillJson(data);
        if (!parsed) throw new Error('Invalid drill response');
        setDrill(parsed);

        const completedAt = data.completedAt;
        const feedbackText = data.feedback;
        const improvedVal = data.improved;
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

      const raw: unknown = await res.json();
      if (!raw || typeof raw !== 'object') throw new Error('Invalid response');
      const result = raw as Record<string, unknown>;
      const fb = result.feedback;
      const imp = result.improved;
      if (typeof fb !== 'string') throw new Error('Invalid response');

      setFeedback({
        feedback: fb,
        improved: imp === true,
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

      const sessionRaw: unknown = await sessionRes.json();
      if (!sessionRaw || typeof sessionRaw !== 'object') throw new Error('Invalid session');
      const session = sessionRaw as SessionForDrillPayload;
      if (!Array.isArray(session.insights)) throw new Error('Invalid session');

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

      const createRaw: unknown = await res.json();
      if (!createRaw || typeof createRaw !== 'object') throw new Error('Invalid drill response');
      const created = createRaw as Record<string, unknown>;
      const parsed = parseDrillJson(created);
      if (!parsed) throw new Error('Invalid drill response');

      return parsed.id;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to retry');
      return null;
    }
  }, [drill]);

  return { state, drill, feedback, error, isLoading, startRecording, stopRecording, tryAgain };
}
