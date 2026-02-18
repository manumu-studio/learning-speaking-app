// Protected layout wrapper — checks auth, syncs user, and renders app chrome
import { redirect } from 'next/navigation';
import { SessionProvider } from 'next-auth/react';
import { auth } from '@/features/auth/auth';
import { syncUser } from '@/features/auth/syncUser';
import { TopBar } from '@/components/ui/TopBar';
import type { ReactNode } from 'react';

export default async function AppLayout({ children }: { children: ReactNode }) {
  const session = await auth();

  if (!session?.user?.externalId) {
    redirect('/auth/signin');
  }

  await syncUser({
    externalId: session.user.externalId,
    email: session.user.email,
    displayName: session.user.name,
  });

  return (
    <SessionProvider session={session}>
      <div className="min-h-screen bg-gray-50">
        <TopBar
          userName={session.user.name}
          userEmail={session.user.email}
        />
        <main className="pt-16">{children}</main>
      </div>
    </SessionProvider>
  );
}
