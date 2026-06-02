// useAccentPolish: collapse/expand state for the optional accent-polish section (collapsed by default)

import { useState, useCallback } from 'react';

export interface UseAccentPolishReturn {
  isExpanded: boolean;
  toggle: () => void;
}

export function useAccentPolish(): UseAccentPolishReturn {
  const [isExpanded, setIsExpanded] = useState(false);
  const toggle = useCallback(() => setIsExpanded((prev) => !prev), []);
  return { isExpanded, toggle };
}
