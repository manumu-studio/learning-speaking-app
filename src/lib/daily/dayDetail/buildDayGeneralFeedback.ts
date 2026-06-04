// Builds day-only general feedback, suggestion words, word bank, and active targets
import { DailyConclusionDataSchema } from '@/lib/daily/generateDailyConclusion.types';
import type {
  DayActiveTarget,
  DayGeneralFeedbackData,
  DaySuggestionWord,
  DayWordBankGroup,
} from './buildDayDetailData.types';

const TARGET_COUNT = 4;
const FAMILY_COUNT = 4;

export interface GeneralFeedbackWordBankInput {
  readonly text: string;
  readonly category: string;
  readonly source: string;
  readonly usageCount: number;
  readonly masteryState: string;
  readonly isActiveTarget: boolean;
}

export interface BuildDayGeneralFeedbackInput {
  readonly date: string;
  readonly renderedFeedback: string | null;
  readonly conclusionJson: unknown;
  readonly wordBankItems: readonly GeneralFeedbackWordBankInput[];
}

function dayOfWeek(date: string): number {
  const parsed = new Date(`${date}T00:00:00Z`);
  return Number.isNaN(parsed.getTime()) ? 1 : parsed.getUTCDay();
}

function verbMode(date: string): 'phrasal_verb' | 'prepositional_verb' | 'verb' {
  const modes = ['phrasal_verb', 'prepositional_verb', 'verb'] as const;
  const index = dayOfWeek(date) % modes.length;
  return modes[index] ?? 'verb';
}

function adjectiveAdverbMode(date: string): 'adjective' | 'adverb' {
  return dayOfWeek(date) % 2 === 0 ? 'adverb' : 'adjective';
}

function familyForCategory(category: string): DaySuggestionWord['family'] | null {
  if (category === 'collocation') return 'collocation';
  if (category === 'connector') return 'connector';
  if (category === 'adjective' || category === 'adverb') return 'adjectiveAdverb';
  if (category === 'verb' || category === 'prepositional_verb' || category === 'phrasal_verb') return 'verb';
  return null;
}

function reasonFor(item: GeneralFeedbackWordBankInput): string {
  if (item.isActiveTarget) return 'Active target for tomorrow.';
  if (item.usageCount === 0) return 'High-value item not used yet.';
  return `Used ${item.usageCount} time(s); keep consolidating it.`;
}

function byPriority(a: GeneralFeedbackWordBankInput, b: GeneralFeedbackWordBankInput): number {
  if (a.isActiveTarget !== b.isActiveTarget) return a.isActiveTarget ? -1 : 1;
  if (a.usageCount !== b.usageCount) return a.usageCount - b.usageCount;
  return a.text.localeCompare(b.text);
}

function pickFamily(
  items: readonly GeneralFeedbackWordBankInput[],
  family: DaySuggestionWord['family'],
  categoryFilter: (category: string) => boolean,
): DaySuggestionWord[] {
  return items
    .filter((item) => categoryFilter(item.category))
    .sort(byPriority)
    .slice(0, FAMILY_COUNT)
    .map((item) => ({
      text: item.text,
      family,
      reason: reasonFor(item),
      source: item.source,
    }));
}

function buildSuggestionWords(
  date: string,
  items: readonly GeneralFeedbackWordBankInput[],
): DaySuggestionWord[] {
  const rotatingModifier = adjectiveAdverbMode(date);
  const rotatingVerb = verbMode(date);
  return [
    ...pickFamily(items, 'collocation', (category) => category === 'collocation'),
    ...pickFamily(items, 'connector', (category) => category === 'connector'),
    ...pickFamily(items, 'adjectiveAdverb', (category) => category === rotatingModifier),
    ...pickFamily(items, 'verb', (category) => category === rotatingVerb),
  ];
}

function buildWordBank(items: readonly GeneralFeedbackWordBankInput[]): DayWordBankGroup[] {
  const groups = new Map<string, GeneralFeedbackWordBankInput[]>();
  for (const item of items) {
    const family = familyForCategory(item.category) ?? 'verb';
    const bucket = groups.get(family) ?? [];
    bucket.push(item);
    groups.set(family, bucket);
  }
  return [...groups.entries()].map(([label, groupItems]) => ({
    label,
    items: groupItems.sort(byPriority).map((item) => ({
      text: item.text,
      masteryState: item.masteryState,
      usageCount: item.usageCount,
      isActiveTarget: item.isActiveTarget,
    })),
  }));
}

function buildActiveTargets(
  conclusionJson: unknown,
  items: readonly GeneralFeedbackWordBankInput[],
): DayActiveTarget[] {
  const parsed = DailyConclusionDataSchema.safeParse(conclusionJson);
  const conclusionTargets = parsed.success ? parsed.data.activeTargetsTomorrow : [];
  const focusReasons = new Map(
    parsed.success ? parsed.data.focusTomorrow.map((focus) => [focus.tag, focus.reason]) : [],
  );
  const targets = conclusionTargets.length > 0
    ? conclusionTargets
    : items.filter((item) => item.isActiveTarget).sort(byPriority).map((item) => item.text);
  return targets.slice(0, TARGET_COUNT).map((text) => ({
    text,
    reason: focusReasons.get(text) ?? 'Tomorrow target.',
  }));
}

/** Builds the day-only General Feedback section from cached conclusion and word-bank evidence. */
export function buildDayGeneralFeedback(input: BuildDayGeneralFeedbackInput): DayGeneralFeedbackData {
  const parsed = DailyConclusionDataSchema.safeParse(input.conclusionJson);
  const summary = input.renderedFeedback ?? (parsed.success ? parsed.data.keyInsights.join(' ') : '');
  const suggestionWords = buildSuggestionWords(input.date, input.wordBankItems);
  const wordBank = buildWordBank(input.wordBankItems);
  const activeTargets = buildActiveTargets(input.conclusionJson, input.wordBankItems);
  const hasContent = summary.length > 0 || suggestionWords.length > 0 || wordBank.length > 0 || activeTargets.length > 0;
  return {
    summary,
    suggestionWords,
    wordBank,
    activeTargets,
    emptyState: hasContent ? null : 'No day-level feedback is available yet.',
  };
}
