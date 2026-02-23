// Toggle hook for TranscriptSection expand/collapse state
import { useState } from 'react';

export function useTranscriptSection() {
  const [isExpanded, setIsExpanded] = useState(false);
  const toggle = () => setIsExpanded((prev) => !prev);
  return { isExpanded, toggle };
}
