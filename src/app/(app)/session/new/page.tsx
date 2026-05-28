// New recording session page with full recording and upload flow
'use client';

import { useState, useEffect, startTransition } from 'react';
import { useSearchParams } from 'next/navigation';
import { z } from 'zod';
import { Container } from '@/components/ui/Container';
import { RecordingPanel } from '@/features/recording/RecordingPanel';
import { FocusBanner } from '@/features/dashboard/FocusBanner';
import { findPromptById } from '@/lib/prompts/promptLibrary';
import { PromptBanner } from '@/features/prompts/PromptBanner';
import { useAiDisclosure } from '@/features/recording/useAiDisclosure';
import { AiDisclosureModal } from '@/components/ui/AiDisclosureModal';

const focusSchema = z.object({
  focusKey: z.string(),
  focusLabel: z.string(),
});

export default function NewSessionPage() {
  const { state, acceptDisclosure } = useAiDisclosure();
  const [focus, setFocus] = useState<{ focusKey: string; focusLabel: string } | null>(null);
  const searchParams = useSearchParams();
  const promptId = searchParams.get('promptId');
  const selectedPrompt = promptId !== null ? findPromptById(promptId) : null;

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

  if (state.status === 'loading') {
    return (
      <Container>
        <div className="flex justify-center py-16">
          <span className="text-sm text-gray-500 dark:text-gray-400">Loading…</span>
        </div>
      </Container>
    );
  }

  if (state.status === 'error') {
    return (
      <Container>
        <p className="text-center text-sm text-gray-500 dark:text-gray-400 py-16">
          {state.message}
        </p>
      </Container>
    );
  }

  return (
    <>
      {state.status === 'pending' && <AiDisclosureModal onAccept={acceptDisclosure} />}
      <Container>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100 mb-4 sm:mb-8 text-center">
          New Speaking Session
        </h1>
        {selectedPrompt !== null && (
          <PromptBanner
            promptText={selectedPrompt.text}
            category={selectedPrompt.category}
            className="mb-4"
          />
        )}
        {focus && <FocusBanner focusLabel={focus.focusLabel} className="mb-4" />}
        <RecordingPanel focus={focus} promptUsed={selectedPrompt?.text ?? null} />
      </Container>
    </>
  );
}
