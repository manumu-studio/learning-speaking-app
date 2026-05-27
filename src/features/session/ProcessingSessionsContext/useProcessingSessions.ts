// Hook for accessing background processing sessions context
'use client';

import { useContext } from 'react';
import { ProcessingSessionsContext } from './ProcessingSessionsContext';
import type { ProcessingSessionsContextValue } from './ProcessingSessionsContext.types';

export function useProcessingSessions(): ProcessingSessionsContextValue {
  const context = useContext(ProcessingSessionsContext);
  if (context === null) {
    throw new Error('useProcessingSessions must be used within ProcessingSessionsProvider');
  }
  return context;
}
