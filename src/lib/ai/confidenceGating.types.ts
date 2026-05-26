// Types for Whisper segment confidence gating before coaching analysis

import type { WhisperSegment } from '@/lib/ai/whisper.types';

export type SuspectReason = 'silence' | 'repetition-loop' | 'low-confidence';

export interface AnnotatedSegment {
  text: string;
  suspect: boolean;
  reason?: SuspectReason;
  source: WhisperSegment;
}

export interface AnnotatedTranscript {
  cleanText: string;
  annotatedText: string;
  segments: AnnotatedSegment[];
  stats: {
    totalSegments: number;
    droppedSegments: number;
    suspectSegments: number;
    cleanSegments: number;
  };
}
