// Identifies language bank items unused for 2+ days and returns them for re-suggestion

import type { MasteryState } from './languageBank.types';

export interface RecycleInputItem {
  id: string;
  lastUsedAt: Date | null;
  isActiveTarget: boolean;
  masteryState: MasteryState;
}

export interface RecycleInput {
  items: RecycleInputItem[];
  now: Date;
}

export interface RecycleResult {
  recycleIds: string[]; // item IDs to mark for re-suggestion
}

const TWO_DAYS_MS = 2 * 24 * 60 * 60 * 1000;

function isStale(lastUsedAt: Date | null, now: Date): boolean {
  if (lastUsedAt === null) return true;
  return now.getTime() - lastUsedAt.getTime() > TWO_DAYS_MS;
}

export function identifyRecyclableItems(input: RecycleInput): RecycleResult {
  const { items, now } = input;

  const recycleIds = items
    .filter(
      (item) =>
        item.isActiveTarget &&
        item.masteryState !== 'mastered' &&
        isStale(item.lastUsedAt, now),
    )
    .map((item) => item.id);

  return { recycleIds };
}
