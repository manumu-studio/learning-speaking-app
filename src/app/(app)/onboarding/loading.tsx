// Onboarding page loading state
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

export default function OnboardingLoading() {
  return (
    <div className="mx-auto max-w-lg px-4 py-12 flex justify-center">
      <LoadingSpinner />
    </div>
  );
}
