// Functional-load types — phoneme/structural error weighting for Spanish-L1 pronunciation ranking

/** Functional-load tier: how much the error degrades intelligibility. */
export type FLTier = 'high' | 'moderate' | 'low';

/** Numeric weight paired to each tier (high=3, moderate=2, low=1). */
export type FLWeight = 3 | 2 | 1;

/**
 * Whether an entry maps to a single Azure phoneme (`phoneme`) or to a
 * structural L1 pattern Azure cannot score directly (`structural`),
 * e.g. s-cluster epenthesis or dropped final consonants.
 */
export type FLKind = 'phoneme' | 'structural';

/** An example word with its IPA transcription and a double-vowel-sound flag for UI emphasis. */
export interface PhoneticExample {
  /** The orthographic word, e.g. "sheep". */
  word: string;
  /** IPA transcription, e.g. "/ʃiːp/". */
  ipa: string;
  /** True when the word contains a long vowel or diphthong (a "double vowel sound") worth highlighting. */
  hasDoubleVowelSound: boolean;
}

/** A single functional-load knowledge entry: the error, its weight, how to fix it, and examples. */
export interface FunctionalLoadEntry {
  /** Stable id, e.g. "ship-sheep" or "s-cluster". */
  id: string;
  /** Intelligibility tier. */
  tier: FLTier;
  /** Numeric weight derived from the tier. */
  weight: FLWeight;
  /** Phoneme-level or structural. */
  kind: FLKind;
  /** Human label, e.g. "ship / sheep". */
  label: string;
  /** IPA symbols (as emitted by `sapiToIpa`) that map to this entry. Empty for pure-structural entries. */
  ipaSymbols: string[];
  /** What the error sounds like / why it happens. */
  description: string;
  /** Concrete production rule — how to pronounce it correctly. */
  rule: string;
  /** Minimal-pair / illustrative examples with IPA. */
  examples: PhoneticExample[];
}

/** A functional-load entry joined to a learner's actual session data and scored for ranking. */
export interface RankedFLError extends FunctionalLoadEntry {
  /** Average Azure accuracy for the matched phoneme(s); `null` for structural entries with no direct score. */
  averageScore: number | null;
  /** How many times the error surfaced in the session (phoneme occurrences or structural hits). */
  occurrences: number;
  /** Ranking key: `weight × occurrences`. Higher = higher priority. */
  flScore: number;
}
