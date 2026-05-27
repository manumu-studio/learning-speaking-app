// usePhonemeAlphabet: localStorage-persisted toggle between IPA and SAPI phoneme display

'use client';

import { useCallback, useEffect, useState } from 'react';
import { sapiToIpa } from '@/lib/pronunciation/sapiToIpa';

// ─── Types ────────────────────────────────────────────────────────────────────

export type PhonemeAlphabet = 'ipa' | 'sapi';

export interface UsePhonemeAlphabetReturn {
  /** Currently active phoneme alphabet. */
  alphabet: PhonemeAlphabet;
  /** Toggle between 'ipa' and 'sapi'. Persists to localStorage. */
  toggleAlphabet: () => void;
  /**
   * Map a SAPI code to the display string for the active alphabet.
   * Returns IPA symbol when alphabet is 'ipa', raw SAPI code otherwise.
   */
  displayPhoneme: (sapi: string) => string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STORAGE_KEY = 'lsa-phoneme-alphabet';
const DEFAULT_ALPHABET: PhonemeAlphabet = 'ipa';

function readStoredAlphabet(): PhonemeAlphabet {
  const stored = window.localStorage.getItem(STORAGE_KEY);
  return stored === 'sapi' ? 'sapi' : DEFAULT_ALPHABET;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function usePhonemeAlphabet(): UsePhonemeAlphabetReturn {
  const [alphabet, setAlphabet] = useState<PhonemeAlphabet>(DEFAULT_ALPHABET);

  // Hydrate from localStorage after mount — avoids SSR/client mismatch
  useEffect(() => {
    const rafId = window.requestAnimationFrame(() => {
      setAlphabet(readStoredAlphabet());
    });
    return () => {
      window.cancelAnimationFrame(rafId);
    };
  }, []);

  const toggleAlphabet = useCallback(() => {
    setAlphabet((prev) => {
      const next: PhonemeAlphabet = prev === 'ipa' ? 'sapi' : 'ipa';
      window.localStorage.setItem(STORAGE_KEY, next);
      return next;
    });
  }, []);

  const displayPhoneme = useCallback(
    (sapi: string): string => (alphabet === 'ipa' ? sapiToIpa(sapi) : sapi),
    [alphabet],
  );

  return { alphabet, toggleAlphabet, displayPhoneme };
}
