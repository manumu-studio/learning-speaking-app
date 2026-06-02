// Top section of the recording panel — session context, prompt card, and warnings
'use client';

import { PromptCard } from '@/features/recording/PromptCard';
import {
  RecordingContext,
  useRecordingContext,
} from '@/features/recording/RecordingContext';
import type { PromptCategory, SpeakingPrompt } from '@/features/recording/prompts.config';

interface RecordingPanelHeaderProps {
  activeCategory: PromptCategory;
  isFreeSpeak: boolean;
  selectedPrompt: SpeakingPrompt | null;
  warnings: string[];
  onCategoryChange: (category: PromptCategory) => void;
  onFreeSpeakToggle: () => void;
}

export function RecordingPanelHeader({
  activeCategory,
  isFreeSpeak,
  selectedPrompt,
  warnings,
  onCategoryChange,
  onFreeSpeakToggle,
}: RecordingPanelHeaderProps) {
  const { todaySessionCount, nextRecordingNumber, isLoading } = useRecordingContext();

  return (
    <div className="w-full space-y-2 px-2 shrink-0">
      <RecordingContext
        todaySessionCount={todaySessionCount}
        nextRecordingNumber={nextRecordingNumber}
        isLoading={isLoading}
      />
      <PromptCard
        prompt={isFreeSpeak ? null : selectedPrompt}
        activeCategory={activeCategory}
        onCategoryChange={onCategoryChange}
        onFreeSpeakToggle={onFreeSpeakToggle}
        isFreeSpeak={isFreeSpeak}
      />
      {warnings.length > 0 && (
        <div className="space-y-1.5">
          {warnings.map((warning) => (
            <div key={warning} className="rounded-lg bg-amber-500/10 px-3 py-1.5 text-xs text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">
              {warning}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
