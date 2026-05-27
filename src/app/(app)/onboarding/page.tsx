// Onboarding page — placement test flow for first-time users
import { Suspense } from 'react';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { OnboardingFlow } from '@/features/onboarding/OnboardingFlow';

export default function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ session?: string }>;
}) {
  return (
    <main className="mx-auto max-w-lg px-4 py-12">
      <Suspense fallback={<LoadingSpinner />}>
        <OnboardingFlow searchParams={searchParams} />
      </Suspense>
    </main>
  );
}
