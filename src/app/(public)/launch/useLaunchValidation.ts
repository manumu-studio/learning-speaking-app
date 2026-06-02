// useLaunchValidation — hook that validates an invitation token and redirects on success
'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';

// Extract token from either a full URL or a raw token string
function extractToken(input: string): string {
  try {
    const url = new URL(input.trim());
    return url.searchParams.get('token') ?? input.trim();
  } catch {
    return input.trim();
  }
}

export interface LaunchValidationState {
  error: string | null;
  isValidating: boolean;
}

export interface UseLaunchValidationReturn extends LaunchValidationState {
  validateAndRedirect: (rawInput: string) => Promise<void>;
  clearError: () => void;
}

export function useLaunchValidation(): UseLaunchValidationReturn {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isValidating, setIsValidating] = useState(false);

  const clearError = useCallback(() => { setError(null); }, []);

  const validateAndRedirect = useCallback(async (rawInput: string) => {
    const token = extractToken(rawInput);
    if (!token) return;
    setIsValidating(true);
    setError(null);
    try {
      const res = await fetch('/api/launch/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });
      if (res.ok) {
        router.push(`/explanation?token=${token}`);
      } else {
        setError('Invalid invitation code. Please try again.');
        setIsValidating(false);
      }
    } catch {
      setError('Something went wrong. Please try again.');
      setIsValidating(false);
    }
  }, [router]);

  return { error, isValidating, validateAndRedirect, clearError };
}
