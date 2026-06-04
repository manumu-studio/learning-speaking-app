// Toggle state hook for switching between original and improved transcript

import { useState, useCallback, useMemo } from 'react';

export type TranscriptView = 'pronunciation' | 'original' | 'improved';

export function useTranscriptToggle(defaultView: TranscriptView = 'original') {
  const [view, setView] = useState<TranscriptView>(defaultView);

  const selectView = useCallback((next: TranscriptView) => {
    setView(next);
  }, []);

  return useMemo(
    () => ({ view, selectView }),
    [view, selectView],
  );
}
