// Type definitions for L1 pronunciation bridge rules
import type { L1Tag } from './l1Spanish.types';

export type BridgeSeverity = 'high' | 'medium' | 'low';

export type BridgeCategory = 'consonant' | 'vowel' | 'prosody';

export interface BridgeRule {
  readonly tag: L1Tag;
  readonly expected: string;
  readonly spoken: string;
  readonly severity: BridgeSeverity;
  readonly category: BridgeCategory;
  readonly spanishAnchor: string;
  readonly englishTarget: string;
  readonly bridgeInstruction: string;
  readonly minimalPairs: ReadonlyArray<readonly [string, string]>;
  readonly commonWords: readonly string[];
}

export interface BridgeFeedback {
  readonly tag: L1Tag;
  readonly rule: BridgeRule;
}
