// AI & Data settings section — AI disclosure modal trigger and privacy note
'use client';

import { useState } from 'react';
import { AiDisclosureModal } from '@/components/ui/AiDisclosureModal';

export function SettingsAiDataSection() {
  const [showAiDisclosure, setShowAiDisclosure] = useState(false);

  return (
    <section
      aria-labelledby="ai-data-heading"
      className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 space-y-4"
    >
      <h2
        id="ai-data-heading"
        className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400"
      >
        AI & Data
      </h2>
      <p className="text-sm text-gray-600 dark:text-gray-400">
        Your speech is analyzed by three AI services. No data is used for model training.
      </p>
      <button
        type="button"
        onClick={() => setShowAiDisclosure(true)}
        className="text-sm text-blue-600 dark:text-blue-400 hover:underline focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
      >
        View AI provider disclosure →
      </button>
      {showAiDisclosure && (
        <AiDisclosureModal infoOnly onAccept={() => setShowAiDisclosure(false)} />
      )}
    </section>
  );
}
