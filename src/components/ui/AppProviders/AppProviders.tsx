// Client-side provider wrapper for global app context and UI overlays
'use client';

import { ProcessingSessionsProvider } from '@/features/session/ProcessingSessionsContext';
import { ProcessingToast } from '@/components/ui/ProcessingToast';
import type { AppProvidersProps } from './AppProviders.types';

export function AppProviders({ children }: AppProvidersProps) {
  return (
    <ProcessingSessionsProvider>
      {children}
      <ProcessingToast />
    </ProcessingSessionsProvider>
  );
}
