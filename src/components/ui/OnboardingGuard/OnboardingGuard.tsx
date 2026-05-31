// Client-side onboarding redirect — uses usePathname for reliable CSR navigation checks
'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import type { OnboardingGuardProps } from './OnboardingGuard.types';

export function OnboardingGuard({ onboardedAt, children }: OnboardingGuardProps) {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (onboardedAt !== null) {
      return;
    }
    if (pathname.startsWith('/onboarding')) {
      return;
    }
    router.replace('/onboarding');
  }, [onboardedAt, pathname, router]);

  if (onboardedAt === null && !pathname.startsWith('/onboarding')) {
    return null;
  }

  return children;
}
