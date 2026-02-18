// Type definitions for speaking sessions and related entities
import type {
  User,
  UserConsent,
  SpeakingSession,
  Transcript,
  Insight,
  PatternProfile
} from '@prisma/client';

// Re-export Prisma types
export type {
  User,
  UserConsent,
  SpeakingSession,
  Transcript,
  Insight,
  PatternProfile
};

// Union types for enums (use these outside Prisma)
export type SessionStatus =
  | 'CREATED'
  | 'UPLOADED'
  | 'TRANSCRIBING'
  | 'ANALYZING'
  | 'DONE'
  | 'FAILED';

export type ConsentFlag =
  | 'AUDIO_STORAGE'
  | 'TRANSCRIPT_STORAGE'
  | 'PATTERN_TRACKING';

export type InsightCategory =
  | 'grammar'
  | 'vocabulary'
  | 'structure'
  | 'pronunciation'
  | 'fluency'
  | 'coherence';

export type InsightSeverity =
  | 'high'
  | 'medium'
  | 'low';

// Composite types with relations
export type SpeakingSessionWithTranscript = SpeakingSession & {
  transcript: Transcript | null;
};

export type SpeakingSessionWithInsights = SpeakingSession & {
  insights: Insight[];
};

export type SpeakingSessionComplete = SpeakingSession & {
  transcript: Transcript | null;
  insights: Insight[];
  user: User;
};

export type UserWithProfile = User & {
  patternProfile: PatternProfile | null;
};

// Input types for creating/updating
export type CreateSessionInput = {
  userId: string;
  language?: string;
  topic?: string;
  promptUsed?: string;
};

export type UpdateSessionInput = {
  status?: SessionStatus;
  durationSecs?: number;
  audioUrl?: string;
  errorMessage?: string;
  focusNext?: string;
};

export type CreateInsightInput = {
  sessionId: string;
  category: InsightCategory;
  pattern: string;
  detail: string;
  frequency?: number;
  severity?: InsightSeverity;
  examples?: unknown;
  suggestion?: string;
};
