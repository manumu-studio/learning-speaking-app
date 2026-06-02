// Barrel export for pronunciation utilities
export { SAPI_TO_IPA, sapiToIpa, wordToIpa } from './sapiToIpa';
export { aggregatePhonemes, aggregateAllPhonemes } from './aggregatePhonemes';
export type { AggregatedPhoneme } from './aggregatePhonemes';
export {
  FUNCTIONAL_LOAD_TABLE,
  PHONEME_FL_ENTRIES,
  STRUCTURAL_FL_ENTRIES,
  hasDoubleVowelSound,
  lookupByIpa,
} from './functionalLoad';
export type {
  FLTier,
  FLWeight,
  FLKind,
  PhoneticExample,
  FunctionalLoadEntry,
  RankedFLError,
} from './functionalLoad.types';
export { rankByFunctionalLoad, splitByPriority } from './rankByFunctionalLoad';
