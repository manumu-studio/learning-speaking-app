// Custom hook for cookie consent state — reads/writes localStorage
'use client';

import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'cookie-consent-accepted';

export function useCookieConsent() {
  const [isAccepted, setIsAccepted] = useState<boolean | null>(null);

  useEffect(() => {
    // Read from localStorage on mount (client-side only)
    const stored = localStorage.getItem(STORAGE_KEY);

    // Defer state update to avoid synchronous setState inside effect body
    const rafId = window.requestAnimationFrame(() => {
      setIsAccepted(stored === 'true');
    });

    return () => {
      window.cancelAnimationFrame(rafId);
    };
  }, []);

  const accept = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, 'true');
    setIsAccepted(true);
  }, []);

  return { isAccepted, accept };
}
