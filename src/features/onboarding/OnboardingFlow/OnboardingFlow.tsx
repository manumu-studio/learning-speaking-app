// Client orchestrator for the three-step onboarding flow
'use client';

import { use, useState } from 'react';
import dynamic from 'next/dynamic';
import { OnboardingWelcome } from '@/features/onboarding/OnboardingWelcome';
import { VoiceProfile } from '@/features/onboarding/VoiceProfile';
import type { OnboardingFlowProps, OnboardingStep } from './OnboardingFlow.types';

const OnboardingRecorder = dynamic(
  () => import('@/features/onboarding/OnboardingRecorder').then((m) => ({ default: m.OnboardingRecorder })),
  { ssr: false },
);

export function OnboardingFlow({ searchParams }: OnboardingFlowProps) {
  const { session: initialSessionId } = use(searchParams);
  const [step, setStep] = useState<OnboardingStep>(
    initialSessionId ? 'results' : 'welcome',
  );
  const [sessionId, setSessionId] = useState<string | null>(initialSessionId ?? null);

  const handleStart = () => setStep('recording');

  const handleRecordingComplete = (id: string) => {
    setSessionId(id);
    setStep('results');
  };

  if (step === 'welcome') {
    return <OnboardingWelcome onStart={handleStart} />;
  }

  if (step === 'recording') {
    return <OnboardingRecorder onComplete={handleRecordingComplete} />;
  }

  if (step === 'results' && sessionId !== null) {
    return <VoiceProfile sessionId={sessionId} />;
  }

  return <OnboardingWelcome onStart={handleStart} />;
}
