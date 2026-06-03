// Selects 12 daily suggestions with weekday-based category rotation and priority scoring

import type { MasteryState, SuggestionCategory } from './languageBank.types';
import { MASTERY_ORDER, MASTERY_THRESHOLDS, WEEKDAY_CATEGORIES } from './languageBank.types';

export interface SelectionItem {
  id: string;
  text: string;
  category: SuggestionCategory;
  usageCount: number;
  masteryState: MasteryState;
  lastSuggestedAt: Date | null;
}

export interface SelectionInput {
  items: SelectionItem[];
  dayOfWeek: number; // 0=Sun, 1=Mon, ... 6=Sat
}

export interface DailySuggestions {
  suggestions: Array<{ id: string; text: string; category: SuggestionCategory }>;
  activeTargetIds: string[]; // top 4 items from suggestions
}

const SLOTS_PER_PILLAR = 4;
const ACTIVE_TARGET_COUNT = 4;

function distanceToNextThreshold(usageCount: number, masteryState: MasteryState): number {
  const nextIndex = MASTERY_ORDER.indexOf(masteryState) + 1;
  if (nextIndex >= MASTERY_ORDER.length) return Infinity;
  const nextState = MASTERY_ORDER[nextIndex];
  if (nextState === undefined) return Infinity;
  return MASTERY_THRESHOLDS[nextState].min - usageCount;
}

function sortByPriority(items: SelectionItem[]): SelectionItem[] {
  return [...items].sort((a, b) => {
    const distA = distanceToNextThreshold(a.usageCount, a.masteryState);
    const distB = distanceToNextThreshold(b.usageCount, b.masteryState);
    if (distA !== distB) return distA - distB;

    const timeA = a.lastSuggestedAt?.getTime() ?? 0;
    const timeB = b.lastSuggestedAt?.getTime() ?? 0;
    return timeA - timeB; // oldest first (smallest timestamp)
  });
}

interface PickOptions {
  byCategory: Map<SuggestionCategory, SelectionItem[]>;
  categories: readonly SuggestionCategory[];
  count: number;
  allSorted: SelectionItem[];
}

function pickFromCategory(opts: PickOptions, usedIds: Set<string>): SelectionItem[] {
  const pool = opts.categories.flatMap((cat) => opts.byCategory.get(cat) ?? []);
  const sorted = sortByPriority(pool.filter((item) => !usedIds.has(item.id)));
  const picked = sorted.slice(0, opts.count);

  if (picked.length < opts.count) {
    const needed = opts.count - picked.length;
    const fallback = opts.allSorted.filter(
      (item) => !usedIds.has(item.id) && !picked.some((p) => p.id === item.id),
    );
    picked.push(...fallback.slice(0, needed));
  }

  return picked;
}

export function selectDailySuggestions(input: SelectionInput): DailySuggestions {
  const { items, dayOfWeek } = input;

  const byCategory = new Map<SuggestionCategory, SelectionItem[]>();
  for (const item of items) {
    const bucket = byCategory.get(item.category) ?? [];
    bucket.push(item);
    byCategory.set(item.category, bucket);
  }

  const allSorted = sortByPriority(items);
  const usedIds = new Set<string>();

  const pickOpts = { byCategory, allSorted };

  const collocationItems = pickFromCategory(
    { ...pickOpts, categories: ['collocation'], count: SLOTS_PER_PILLAR }, usedIds,
  );
  collocationItems.forEach((item) => usedIds.add(item.id));

  const verbItems = pickFromCategory(
    { ...pickOpts, categories: ['verb', 'prepositional_verb'], count: SLOTS_PER_PILLAR }, usedIds,
  );
  verbItems.forEach((item) => usedIds.add(item.id));

  const rotatingCategory = WEEKDAY_CATEGORIES[dayOfWeek] ?? 'connector';
  const rotatingItems = pickFromCategory(
    { ...pickOpts, categories: [rotatingCategory], count: SLOTS_PER_PILLAR }, usedIds,
  );
  rotatingItems.forEach((item) => usedIds.add(item.id));

  const allPicked = [...collocationItems, ...verbItems, ...rotatingItems];

  // Active targets: top 4 by priority (closest to next mastery threshold)
  const sortedForActive = sortByPriority(allPicked);
  const activeTargetIds = sortedForActive.slice(0, ACTIVE_TARGET_COUNT).map((item) => item.id);

  const suggestions = allPicked.map(({ id, text, category }) => ({ id, text, category }));

  return { suggestions, activeTargetIds };
}
