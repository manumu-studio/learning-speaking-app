// Types for tracking background session processing state

export interface ProcessingSessionEntry {
  id: string;
  addedAt: number;
}

export interface ProcessingSessionsContextValue {
  sessions: ProcessingSessionEntry[];
  addSession: (id: string) => void;
  removeSession: (id: string) => void;
}
