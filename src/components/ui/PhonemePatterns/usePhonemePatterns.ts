// Hook for PhonemePatterns toggle state

import { useState } from 'react';

export function usePhonemePatterns() {
  const [isExpanded, setIsExpanded] = useState(false);
  const toggle = () => setIsExpanded((prev) => !prev);

  return { isExpanded, toggle };
}
