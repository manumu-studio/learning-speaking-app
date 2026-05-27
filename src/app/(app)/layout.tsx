// Protected layout wrapper — checks auth, syncs user, and renders app chrome
import { redirect } from 'next/navigation';
import { SessionProvider } from 'next-auth/react';
import { auth } from '@/features/auth/auth';
import { syncUser } from '@/features/auth/syncUser';
import { TopBar } from '@/components/ui/TopBar';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { AppProviders } from '@/components/ui/AppProviders';
import type { ReactNode } from 'react';

export default async function AppLayout({ children }: { children: ReactNode }) {
  const session = await auth();

  if (!session?.user?.externalId) {
    redirect('/');
  }

  await syncUser({
    externalId: session.user.externalId,
    email: session.user.email ?? null,
    displayName: session.user.name ?? null,
  });

  return (
    <SessionProvider session={session}>
      <ErrorBoundary>
        <AppProviders>
          <div className="min-h-screen bg-gray-50 dark:bg-black transition-colors duration-200">
            <TopBar
              userName={session.user.name ?? null}
              userEmail={session.user.email ?? null}
            />
            <main id="main-content" className="pt-16">
              {children}
            </main>
          </div>
        </AppProviders>
      </ErrorBoundary>
    </SessionProvider>
  );
}
