// Builds day-level general feedback from a DayEvidenceBundle — deterministic, no AI calls
import type {
  DayActiveTarget,
  DayGeneralFeedbackData,
  DaySuggestionWord,
  DayWordBankGroup,
} from './buildDayDetailData.types';
import type { DayEvidenceBundle } from './buildDayEvidenceBundle';
import { buildDaySummaryNarrative } from './buildDaySummaryNarrative';
import { buildSuggestionWords } from './buildSuggestionWords';

const TARGET_COUNT = 4;

// ---------------------------------------------------------------------------
// Active targets (highest-impact from the 16 suggestion words)
// ---------------------------------------------------------------------------

// Maps language/delivery metric keys to suggestion word families.
// Pronunciation metrics (pronunciationAccuracy, prosodyScore) are excluded —
// active targets are language-oriented; pronunciation weakness doesn't inform word choice.
const METRIC_TO_FAMILY: Record<string, string> = {
  connectorRepetition: 'connector',
  structuralVariety: 'connector',
  vocabularyPrecision: 'collocation',
  verbAccuracy: 'verb',
  lexicalSophistication: 'adjectiveAdverb',
  registerPragmatics: 'collocation',
  argumentClosure: 'connector',
  speakingRate: 'verb',
  fillerUsage: 'connector',
};

function buildActiveTargets(
  suggestionWords: readonly DaySuggestionWord[],
  bundle: DayEvidenceBundle,
): DayActiveTarget[] {
  const focusFamilies = new Set(
    bundle.focusAreas.map((key) => METRIC_TO_FAMILY[key]).filter((f): f is string => f !== undefined),
  );
  const ranked = [...suggestionWords].sort((a, b) => {
    const aRelevant = focusFamilies.has(a.family) ? 0 : 1;
    const bRelevant = focusFamilies.has(b.family) ? 0 : 1;
    if (aRelevant !== bRelevant) return aRelevant - bRelevant;
    const sourceOrder = a.source === 'fallback_pool' ? 1 : 0;
    const bSourceOrder = b.source === 'fallback_pool' ? 1 : 0;
    return sourceOrder - bSourceOrder;
  });
  return ranked.slice(0, TARGET_COUNT).map((word) => ({
    text: word.text,
    reason: word.reason,
  }));
}

// ---------------------------------------------------------------------------
// Word bank builder
// ---------------------------------------------------------------------------

function familyForCategory(category: string): string {
  if (category === 'collocation') return 'collocation';
  if (category === 'connector') return 'connector';
  if (category === 'adjective' || category === 'adverb') return 'adjectiveAdverb';
  return 'verb';
}

function buildWordBank(
  suggestionWords: readonly DaySuggestionWord[],
  existingItems: DayEvidenceBundle['existingBankItems'],
): DayWordBankGroup[] {
  const groups = new Map<string, Array<{
    text: string;
    masteryState: string;
    usageCount: number;
    isActiveTarget: boolean;
  }>>();

  // Add suggestion words as "new" items
  for (const word of suggestionWords) {
    const bucket = groups.get(word.family) ?? [];
    bucket.push({
      text: word.text,
      masteryState: 'new',
      usageCount: 0,
      isActiveTarget: false,
    });
    groups.set(word.family, bucket);
  }

  // Merge existing bank items
  for (const item of existingItems) {
    const label = familyForCategory(item.category);
    const bucket = groups.get(label) ?? [];
    const alreadyExists = bucket.some((b) => b.text === item.text);
    if (!alreadyExists) {
      bucket.push({
        text: item.text,
        masteryState: item.masteryState,
        usageCount: item.usageCount,
        isActiveTarget: item.isActiveTarget,
      });
    }
    groups.set(label, bucket);
  }

  return [...groups.entries()].map(([label, items]) => ({
    label,
    items: items.sort((a, b) => {
      if (a.isActiveTarget !== b.isActiveTarget) return a.isActiveTarget ? -1 : 1;
      if (a.usageCount !== b.usageCount) return a.usageCount - b.usageCount;
      return a.text.localeCompare(b.text);
    }),
  }));
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

/** Builds the day-level General Feedback section from aggregated session evidence. */
export function buildDayGeneralFeedback(bundle: DayEvidenceBundle): DayGeneralFeedbackData {
  const summary = buildDaySummaryNarrative(bundle);
  const suggestionWords = buildSuggestionWords(bundle);
  const wordBank = buildWordBank(suggestionWords, bundle.existingBankItems);
  const activeTargets = buildActiveTargets(suggestionWords, bundle);

  const hasContent = summary.length > 0
    || suggestionWords.length > 0
    || wordBank.length > 0
    || activeTargets.length > 0;

  return {
    summary,
    suggestionWords,
    wordBank,
    activeTargets,
    emptyState: hasContent ? null : 'No day-level feedback is available yet.',
  };
}
