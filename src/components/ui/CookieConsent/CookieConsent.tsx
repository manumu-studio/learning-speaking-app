// Cookie consent banner — explains cookie usage and third-party auth
'use client';

import { useCookieConsent } from './useCookieConsent';
import type { CookieConsentProps } from './CookieConsent.types';

export function CookieConsent({ className }: CookieConsentProps) {
  const { isAccepted, accept } = useCookieConsent();

  // Don't render while checking localStorage (prevents flash)
  // Don't render if already accepted
  if (isAccepted === null || isAccepted) {
    return null;
  }

  return (
    <div
      className={`fixed bottom-0 left-0 right-0 z-50 bg-gray-900 text-white px-4 py-4 ${className ?? ''}`}
      role="banner"
      aria-label="Cookie consent"
    >
      <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        <p className="text-sm text-gray-300 text-center sm:text-left">
          This app uses cookies for session management. Authentication is handled
          securely by{' '}
          <a
            href="https://auth.manumustudio.com"
            className="text-blue-400 hover:underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            ManuMu Studio Auth
          </a>
          .
        </p>
        <button
          onClick={accept}
          className="shrink-0 rounded-md bg-blue-600 px-6 py-2 text-sm font-medium text-white transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-900"
        >
          Accept
        </button>
      </div>
    </div>
  );
}
