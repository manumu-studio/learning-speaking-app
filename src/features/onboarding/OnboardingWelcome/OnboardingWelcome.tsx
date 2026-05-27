// First screen of the onboarding flow — headline, prompt, and start CTA
'use client';

import type { OnboardingWelcomeProps } from './OnboardingWelcome.types';

const ONBOARDING_PROMPT =
  "Tell us about your favorite travel destination — real or imaginary. Why do you love it?";

export function OnboardingWelcome({ onStart }: OnboardingWelcomeProps) {
  return (
    <div className="flex flex-col items-center gap-8 text-center">
      <div className="space-y-3">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-50">
          Let&apos;s hear your voice
        </h1>
        <p className="text-gray-500 dark:text-gray-400 max-w-sm">
          Record a 30–60 second sample and get instant feedback on your
          pronunciation, fluency, and speaking patterns.
        </p>
      </div>

      <div className="w-full rounded-2xl border border-blue-100 bg-blue-50 px-6 py-5 dark:border-blue-900 dark:bg-blue-950/50">
        <p className="text-xs font-semibold uppercase tracking-wide text-blue-500 dark:text-blue-400 mb-2">
          Your topic
        </p>
        <p className="text-lg font-medium text-gray-800 dark:text-gray-100 leading-snug">
          {ONBOARDING_PROMPT}
        </p>
      </div>

      <ul className="w-full space-y-2 text-left text-sm text-gray-500 dark:text-gray-400">
        <li className="flex items-start gap-2">
          <span className="mt-0.5 text-blue-500">→</span>
          Speak naturally — there are no right or wrong answers
        </li>
        <li className="flex items-start gap-2">
          <span className="mt-0.5 text-blue-500">→</span>
          Aim for 30 to 60 seconds
        </li>
        <li className="flex items-start gap-2">
          <span className="mt-0.5 text-blue-500">→</span>
          We&apos;ll analyse your voice and set up your training plan
        </li>
      </ul>

      <button
        type="button"
        onClick={onStart}
        className="
          w-full rounded-xl bg-blue-600 px-6 py-4 text-base font-semibold text-white
          hover:bg-blue-700 active:bg-blue-800
          transition-colors duration-150
          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
          dark:focus:ring-offset-black
        "
      >
        Start recording
      </button>
    </div>
  );
}
