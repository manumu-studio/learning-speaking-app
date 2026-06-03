// Barrel exports for the daily conclusion engine

export { DailyConclusionDataSchema } from './generateDailyConclusion.types';
export type {
  DailyConclusionData,
  Win,
  Struggle,
  PersistentStruggle,
  ImprovedItem,
  FocusTomorrow,
} from './generateDailyConclusion.types';
export { generateDailyConclusion } from './generateDailyConclusion';
export { fetchDayData } from './fetchDayData';

// ─── Language Bank sub-module ─────────────────────────────────────────────────
export type { MasteryState, SuggestionCategory, ItemSource, LanguageBankItemData } from './languageBank/languageBank.types';
export { MASTERY_THRESHOLDS, MASTERY_ORDER, WEEKDAY_CATEGORIES } from './languageBank/languageBank.types';
export type { SelectionItem, SelectionInput, DailySuggestions } from './languageBank/selectDailySuggestions';
export { selectDailySuggestions } from './languageBank/selectDailySuggestions';
export { advanceMastery } from './languageBank/advanceMastery';
export type { RecycleInputItem, RecycleInput, RecycleResult } from './languageBank/recycleUnusedItems';
export { identifyRecyclableItems } from './languageBank/recycleUnusedItems';
export { scanTranscriptForUsage } from './languageBank/scanTranscriptForUsage';
