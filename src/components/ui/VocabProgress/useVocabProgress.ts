// Hook for VocabProgress — computes adoption stats from vocab items

import { useMemo } from 'react';
import type { VocabItem } from './VocabProgress.types';

export function useVocabProgress(items: VocabItem[]) {
  return useMemo(() => {
    const adopted = items.filter((item) => item.firstUsedAt !== null);
    const pending = items.filter((item) => item.firstUsedAt === null);
    const total = items.length;
    const adoptedCount = adopted.length;
    const label = total > 0 ? `${adoptedCount}/${total} words adopted` : 'No vocabulary tracked yet';

    return { adopted, pending, total, adoptedCount, label };
  }, [items]);
}
