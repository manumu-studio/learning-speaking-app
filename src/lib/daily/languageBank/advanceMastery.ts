// State machine for advancing language bank item mastery based on usage count and session spread

import type { MasteryState } from './languageBank.types';
import { MASTERY_ORDER } from './languageBank.types';

interface AdvanceMasteryInput {
  currentState: MasteryState;
  usageCount: number;
  distinctSessionCount: number;
}

interface AdvanceMasteryResult {
  newState: MasteryState;
  changed: boolean;
}

function computeTargetState(usageCount: number, distinctSessionCount: number): MasteryState {
  if (usageCount >= 15 && distinctSessionCount >= 3) return 'mastered';
  if (usageCount >= 11) return 'consolidating';
  if (usageCount >= 5) return 'developing';
  return 'emerging';
}

export function advanceMastery(input: AdvanceMasteryInput): AdvanceMasteryResult {
  const { currentState, usageCount, distinctSessionCount } = input;
  const targetState = computeTargetState(usageCount, distinctSessionCount);

  const currentIndex = MASTERY_ORDER.indexOf(currentState);
  const targetIndex = MASTERY_ORDER.indexOf(targetState);

  // State can only go up — take whichever is further along
  const newIndex = Math.max(currentIndex, targetIndex);
  const newState = MASTERY_ORDER[newIndex] ?? currentState;

  return {
    newState,
    changed: newState !== currentState,
  };
}
