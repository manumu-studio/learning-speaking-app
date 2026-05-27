// React context provider for tracking sessions processing in the background
'use client';

import { createContext, useCallback, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type {
  ProcessingSessionEntry,
  ProcessingSessionsContextValue,
} from './ProcessingSessionsContext.types';

export const ProcessingSessionsContext =
  createContext<ProcessingSessionsContextValue | null>(null);

export function ProcessingSessionsProvider({ children }: { children: ReactNode }) {
  const [sessions, setSessions] = useState<ProcessingSessionEntry[]>([]);

  const addSession = useCallback((id: string) => {
    setSessions((prev) => {
      if (prev.some((session) => session.id === id)) {
        return prev;
      }
      return [...prev, { id, addedAt: Date.now() }];
    });
  }, []);

  const removeSession = useCallback((id: string) => {
    setSessions((prev) => prev.filter((session) => session.id !== id));
  }, []);

  const value = useMemo(
    () => ({ sessions, addSession, removeSession }),
    [sessions, addSession, removeSession],
  );

  return (
    <ProcessingSessionsContext.Provider value={value}>
      {children}
    </ProcessingSessionsContext.Provider>
  );
}
