// New recording session page with full recording and upload flow
'use client';

import { useState, useEffect, startTransition } from 'react';
import { Container } from '@/components/ui/Container';
import { RecordingPanel } from '@/features/recording/RecordingPanel';
import { FocusBanner } from '@/features/dashboard/FocusBanner';

export default function NewSessionPage() {
  const [focus, setFocus] = useState<{ focusKey: string; focusLabel: string } | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('lsa-focus');
      if (raw) {
        const parsed: unknown = JSON.parse(raw);
        if (
          typeof parsed === 'object' &&
          parsed !== null &&
          'focusKey' in parsed &&
          'focusLabel' in parsed
        ) {
          const { focusKey, focusLabel } = parsed as { focusKey: string; focusLabel: string };
          startTransition(() => {
            setFocus({ focusKey, focusLabel });
          });
        }
      }
    } catch {
      // Invalid localStorage data — ignore, session works without focus
    }
  }, []);

  return (
    <Container>
      <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100 mb-4 sm:mb-8 text-center">
        New Speaking Session
      </h1>
      {focus && <FocusBanner focusLabel={focus.focusLabel} className="mb-4" />}
      <RecordingPanel focus={focus} />
    </Container>
  );
}
