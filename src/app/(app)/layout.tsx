// Protected app layout with session provider and user info
import { redirect } from 'next/navigation';
import { SessionProvider } from 'next-auth/react';
import { auth, signOut } from '@/features/auth';
import { syncUser } from '@/features/auth/syncUser';
import type { ReactNode } from 'react';

interface AppLayoutProps {
  children: ReactNode;
}

export default async function AppLayout({ children }: AppLayoutProps) {
  const session = await auth();

  // Redirect to sign-in if no session
  if (!session?.user?.externalId) {
    redirect('/auth/signin');
  }

  // Sync user with local database
  await syncUser({
    externalId: session.user.externalId,
    email: session.user.email,
    displayName: session.user.name,
  });

  return (
    <SessionProvider session={session}>
      <div className="min-h-screen bg-gray-50">
        <header className="border-b border-gray-200 bg-white">
          <div className="container mx-auto flex items-center justify-between px-4 py-4">
            <h1 className="text-xl font-bold text-gray-900">
              Learning Speaking App
            </h1>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600">
                Hello, {session.user.name ?? session.user.email ?? 'User'}
              </span>
              <form
                action={async () => {
                  'use server';
                  await signOut({ redirectTo: '/' });
                }}
              >
                <button
                  type="submit"
                  className="rounded-md bg-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-300"
                >
                  Sign Out
                </button>
              </form>
            </div>
          </div>
        </header>
        <main className="container mx-auto px-4 py-8">{children}</main>
      </div>
    </SessionProvider>
  );
}
