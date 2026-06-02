// Voice profile results screen — shown after onboarding recording is processed
'use client';

import { useRouter } from 'next/navigation';
import { isSpeakingMetricKey } from '@/lib/metric-keys';
import { useVoiceProfile } from './useVoiceProfile';
import { VoiceProfileProcessing } from './VoiceProfileProcessing';
import { VoiceProfileFailed } from './VoiceProfileFailed';
import { VoiceProfileResults } from './VoiceProfileResults';
import type { VoiceProfileProps } from './VoiceProfile.types';

const FOCUS_STORAGE_KEY = 'lsa-focus';

const FOCUS_LABEL_MAP: Record<string, string> = {
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

export function VoiceProfile({ sessionId }: VoiceProfileProps) {
  const router = useRouter();
  const {
    isProcessing,
    isDone,
    isFailed,
    status,
    pronScore,
    speakingRateWpm,
    focusAreas,
    weakestMetricKey,
  } = useVoiceProfile(sessionId);

  const handleStartTraining = async () => {
    if (weakestMetricKey !== null && isSpeakingMetricKey(weakestMetricKey)) {
      const label = FOCUS_LABEL_MAP[weakestMetricKey] ?? weakestMetricKey;
      localStorage.setItem(
        FOCUS_STORAGE_KEY,
        JSON.stringify({ focusKey: weakestMetricKey, focusLabel: label }),
      );
    }

    const response = await fetch('/api/users/me', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ onboardedAt: new Date().toISOString() }),
    });

    if (!response.ok) return;

    router.push('/dashboard');
  };

  if (isProcessing || (!isDone && !isFailed)) {
    return <VoiceProfileProcessing status={status} />;
  }

  if (isFailed) {
    return <VoiceProfileFailed onStartTraining={() => void handleStartTraining()} />;
  }

  return (
    <VoiceProfileResults
      pronScore={pronScore}
      speakingRateWpm={speakingRateWpm}
      focusAreas={focusAreas}
      onStartTraining={() => void handleStartTraining()}
    />
  );
}
