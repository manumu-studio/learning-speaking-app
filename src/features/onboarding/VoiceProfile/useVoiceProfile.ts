// Hook that polls a session until DONE and derives voice profile data
'use client';

import { useSessionStatus } from '@/features/session/useSessionStatus';
import type { SessionMetricSnapshot } from '@/features/session/useSessionStatus.types';
import type { VoiceProfileMetric } from './VoiceProfile.types';

const METRIC_LABELS: Record<string, string> = {
  connectorRepetition: 'Connector Variety',
  structuralVariety: 'Sentence Structure',
  vocabularyPrecision: 'Vocabulary Precision',
  verbAccuracy: 'Verb Accuracy',
  argumentClosure: 'Argument Closure',
  fillerUsage: 'Filler Reduction',
  pronunciationAccuracy: 'Pronunciation',
  prosodyScore: 'Rhythm & Prosody',
  speakingRate: 'Speaking Rate',
};

function deriveTopFocusAreas(metrics: SessionMetricSnapshot[]): VoiceProfileMetric[] {
  return [...metrics]
    .sort((a, b) => a.score - b.score)
    .slice(0, 3)
    .map((m) => ({
      key: m.key,
      label: METRIC_LABELS[m.key] ?? m.key,
      score: m.score,
      level: m.level,
    }));
}

interface UseVoiceProfileReturn {
  isProcessing: boolean;
  isDone: boolean;
  isFailed: boolean;
  status: string | null;
  pronScore: number | null;
  speakingRateWpm: number | null;
  focusAreas: VoiceProfileMetric[];
  weakestMetricKey: string | null;
}

interface PronunciationDerived {
  pronScore: number | null;
  speakingRateWpm: number | null;
}

function derivePronunciationValues(
  isDone: boolean,
  pronScore: number | undefined,
  speakingRateWpm: number | undefined,
): PronunciationDerived {
  if (!isDone) {
    return { pronScore: null, speakingRateWpm: null };
  }
  return {
    pronScore: pronScore ?? null,
    speakingRateWpm: speakingRateWpm ?? null,
  };
}

export function useVoiceProfile(sessionId: string): UseVoiceProfileReturn {
  const { session, isProcessing, isDone, isFailed } = useSessionStatus(sessionId);

  const metrics = session?.metrics ?? [];
  const focusAreas = isDone ? deriveTopFocusAreas(metrics) : [];
  const weakestMetricKey = focusAreas[0]?.key ?? null;

  const { pronScore, speakingRateWpm } = derivePronunciationValues(
    isDone,
    session?.pronunciationReport?.pronScore,
    session?.pronunciationReport?.speakingRateWpm,
  );

  return {
    isProcessing,
    isDone,
    isFailed,
    status: session?.status ?? null,
    pronScore,
    speakingRateWpm,
    focusAreas,
    weakestMetricKey,
  };
}
