// Hook managing collapsible source passage state for retell/summarize prompt cards
import { useState } from 'react';

export function useLibraryPromptCard() {
  const [isSourceOpen, setIsSourceOpen] = useState(false);

  const toggleSource = () => setIsSourceOpen((prev) => !prev);

  return { isSourceOpen, toggleSource };
}
