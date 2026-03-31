// New recording session page with full recording and upload flow
'use client';

import { useState } from 'react';
import { Container } from '@/components/ui/Container';
import { RecordingPanel } from '@/features/recording/RecordingPanel';
import { FocusBanner } from '@/features/dashboard/FocusBanner';

function readFocusFromStorage(): { focusKey: string; focusLabel: string } | null {
  if (typeof window === 'undefined') return null;
  
  try {
    const raw = localStorage.getItem('lsa-training-focus');
    if (!raw) return null;
    
    const parsed: unknown = JSON.parse(raw);
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      'focusKey' in parsed &&
      'focusLabel' in parsed &&
      typeof (parsed as { focusKey: unknown }).focusKey === 'string' &&
      typeof (parsed as { focusLabel: unknown }).focusLabel === 'string'
    ) {
      return parsed as { focusKey: string; focusLabel: string };
    }
  } catch {
    // Invalid localStorage data — ignore
  }
  
  return null;
}

export default function NewSessionPage() {
  const [focus] = useState(readFocusFromStorage);

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
