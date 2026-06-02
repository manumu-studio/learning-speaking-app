// Prop types for PhonemeDetail private sub-section components
import type { PhonemeResult } from './PhonemeDetail.types';
import type { L1TagKey } from './PhonemeDetail.types';
import type { BridgeFeedback } from '@/lib/ai/bridgeRules.types';

export interface PhonemesListProps {
  phonemes: PhonemeResult[];
  displayPhoneme: (sapi: string) => string;
}

export interface L1TagsSectionProps {
  knownL1Tags: L1TagKey[];
  bridgeFeedback: BridgeFeedback[];
  displayPhoneme: (sapi: string) => string;
}

export interface ProsodicFeedbackSectionProps {
  breakErrors: string[];
  intonationErrors: string[];
}
