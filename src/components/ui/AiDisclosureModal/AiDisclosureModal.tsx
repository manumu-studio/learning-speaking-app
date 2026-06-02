// AI disclosure modal — shown before first recording or from settings in info mode
'use client';

import type { AiDisclosureModalProps } from './AiDisclosureModal.types';
import { useAiDisclosureModal } from './useAiDisclosureModal';

const PROVIDERS = [
  {
    service: 'Transcription',
    provider: 'OpenAI Whisper',
    data: 'Your audio recording',
  },
  {
    service: 'Coaching analysis',
    provider: 'Anthropic Claude',
    data: 'Transcript text only',
  },
  {
    service: 'Pronunciation scoring',
    provider: 'Microsoft Azure',
    data: 'Your audio recording',
  },
] as const;

const POLICY_BULLETS = [
  'Audio files are deleted immediately after transcription — typically within 60 seconds.',
  'Transcripts and scores are stored securely in your account.',
  'Your data is never used to train AI models.',
] as const;

export function AiDisclosureModal({ onAccept, infoOnly = false }: AiDisclosureModalProps) {
  const { dialogRef, acceptRef, handleKeyDown } = useAiDisclosureModal();

  const intro = infoOnly
    ? "LSA uses three AI services to analyze your speech. Here's exactly what each one receives."
    : 'Before your first session, we want to be transparent about the AI services that analyze your speech.';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="ai-disclosure-title"
        className="relative w-full max-w-md rounded-2xl bg-white dark:bg-gray-900 p-6 shadow-xl"
        onKeyDown={handleKeyDown}
      >
        <h2
          id="ai-disclosure-title"
          className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3"
        >
          How your audio is processed
        </h2>

        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">{intro}</p>

        <table className="w-full text-sm border-collapse mb-4">
          <caption className="sr-only">AI provider list</caption>
          <thead>
            <tr>
              <th className="text-left font-semibold text-gray-900 dark:text-gray-100 py-2 pr-4 align-top">
                Service
              </th>
              <th className="text-left font-semibold text-gray-900 dark:text-gray-100 py-2 pr-4 align-top">
                Provider
              </th>
              <th className="text-left font-semibold text-gray-900 dark:text-gray-100 py-2 align-top">
                What is sent
              </th>
            </tr>
          </thead>
          <tbody>
            {PROVIDERS.map((row) => (
              <tr key={row.service}>
                <td className="py-2 pr-4 align-top text-gray-700 dark:text-gray-300">{row.service}</td>
                <td className="py-2 pr-4 align-top text-gray-700 dark:text-gray-300">{row.provider}</td>
                <td className="py-2 align-top text-gray-700 dark:text-gray-300">{row.data}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-2 mb-4 list-disc pl-5">
          {POLICY_BULLETS.map((bullet) => (
            <li key={bullet}>{bullet}</li>
          ))}
        </ul>

        <a href="/privacy" className="text-sm text-blue-600 dark:text-blue-400 hover:underline">
          Full privacy policy
        </a>

        <button
          ref={acceptRef}
          type="button"
          onClick={onAccept}
          className="mt-4 w-full rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900"
        >
          {infoOnly ? 'Got it' : 'I understand — start recording'}
        </button>
      </div>
    </div>
  );
}
