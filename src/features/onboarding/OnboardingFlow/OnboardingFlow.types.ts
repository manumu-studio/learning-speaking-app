// Type definitions for OnboardingFlow component

export type OnboardingStep = 'welcome' | 'recording' | 'results';

export interface OnboardingFlowProps {
  searchParams: Promise<{ session?: string }>;
}
