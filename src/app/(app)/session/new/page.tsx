// New recording session page with full recording and upload flow
'use client';

import { useState, useEffect, startTransition } from 'react';
import { z } from 'zod';
import { Container } from '@/components/ui/Container';
import { RecordingPanel } from '@/features/recording/RecordingPanel';
import { FocusBanner } from '@/features/dashboard/FocusBanner';

const focusSchema = z.object({
  focusKey: z.string(),
  focusLabel: z.string(),
});

export default function NewSessionPage() {
  const [focus, setFocus] = useState<{ focusKey: string; focusLabel: string } | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('lsa-focus');
      if (raw) {
        const result = focusSchema.safeParse(JSON.parse(raw));
        if (result.success) {
          startTransition(() => {
            setFocus(result.data);
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
