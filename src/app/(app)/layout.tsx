// Protected layout wrapper — checks auth, syncs user, and renders app chrome
import { redirect } from 'next/navigation';
import { SessionProvider } from 'next-auth/react';
import { auth } from '@/features/auth/auth';
import { syncUser } from '@/features/auth/syncUser';
import { TopBar } from '@/components/ui/TopBar';
import { MobileNav } from '@/components/ui/MobileNav';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { AppProviders } from '@/components/ui/AppProviders';
import { OnboardingGuard } from '@/components/ui/OnboardingGuard';
import type { ReactNode } from 'react';

export default async function AppLayout({ children }: { children: ReactNode }) {
  const session = await auth();

  if (!session?.user?.externalId) {
    redirect('/');
  }

  const user = await syncUser({
    externalId: session.user.externalId,
    email: session.user.email ?? null,
    displayName: session.user.name ?? null,
  });

  const onboardedAtIso = user.onboardedAt?.toISOString() ?? null;

  return (
    <SessionProvider session={session}>
      <ErrorBoundary>
        <AppProviders>
          <OnboardingGuard onboardedAt={onboardedAtIso}>
            <div className="min-h-dvh bg-slate-50 dark:bg-black transition-colors duration-200">
              <TopBar
                userName={session.user.name ?? null}
                userEmail={session.user.email ?? null}
              />
              <main id="main-content" className="pt-16 pb-16 md:pb-0">
                {children}
              </main>
              <MobileNav />
            </div>
          </OnboardingGuard>
        </AppProviders>
      </ErrorBoundary>
    </SessionProvider>
  );
}
