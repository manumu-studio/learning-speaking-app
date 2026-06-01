// Toggle state hook for switching between original and improved transcript

import { useState, useCallback, useMemo } from 'react';

export type TranscriptView = 'original' | 'improved';

export function useTranscriptToggle() {
  const [view, setView] = useState<TranscriptView>('original');

  const selectView = useCallback((next: TranscriptView) => {
    setView(next);
  }, []);

  return useMemo(
    () => ({ view, selectView }),
    [view, selectView],
  );
}
