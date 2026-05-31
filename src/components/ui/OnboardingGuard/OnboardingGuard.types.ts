// Type definitions for OnboardingGuard client redirect wrapper
import type { ReactNode } from 'react';

export interface OnboardingGuardProps {
  onboardedAt: string | null;
  children: ReactNode;
}
