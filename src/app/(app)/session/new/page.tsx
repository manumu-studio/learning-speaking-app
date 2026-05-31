// New recording session page with full recording and upload flow
'use client';

import { useState, useEffect, startTransition } from 'react';
import { useSearchParams } from 'next/navigation';
import { z } from 'zod';
import { Container } from '@/components/ui/Container';
import { MicLoadingIndicator } from '@/components/ui/MicLoadingIndicator';
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
    return <MicLoadingIndicator />;
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
      <div className="flex flex-col h-[calc(100dvh-8rem)] max-w-4xl mx-auto px-4 overflow-hidden">
        {selectedPrompt !== null && (
          <PromptBanner
            promptText={selectedPrompt.text}
            category={selectedPrompt.category}
            className="mb-2 shrink-0"
          />
        )}
        {focus && <FocusBanner focusLabel={focus.focusLabel} className="mb-2 shrink-0" />}
        <div className="flex-1 min-h-0 flex items-center">
          <RecordingPanel focus={focus} promptUsed={selectedPrompt?.text ?? null} />
        </div>
      </div>
    </>
  );
}
