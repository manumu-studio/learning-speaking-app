// Toggle state hook for CollapsibleSection expand/collapse
import { useCallback, useState } from 'react';

export function useCollapsibleSection(defaultOpen: boolean) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const toggle = useCallback(() => setIsOpen((prev) => !prev), []);
  return { isOpen, toggle };
}
