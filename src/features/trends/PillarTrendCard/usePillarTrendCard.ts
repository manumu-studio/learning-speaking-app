// usePillarTrendCard — manages expanded/collapsed state for metric drill-down
'use client';

import { useState, useCallback } from 'react';

export function usePillarTrendCard() {
  const [isExpanded, setIsExpanded] = useState(false);

  const toggleExpanded = useCallback(() => {
    setIsExpanded((prev) => !prev);
  }, []);

  return { isExpanded, toggleExpanded } as const;
}
