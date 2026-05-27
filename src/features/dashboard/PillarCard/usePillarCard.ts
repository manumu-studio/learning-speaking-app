// usePillarCard — manages expand/collapse state for a single PillarCard
'use client';

import { useState } from 'react';
import type { PillarKey } from '../pillars';

export function usePillarCard(pillarKey: PillarKey) {
  void pillarKey;
  const [isExpanded, setIsExpanded] = useState(false);

  function toggle() {
    setIsExpanded((prev) => !prev);
  }

  return { isExpanded, toggle };
}
