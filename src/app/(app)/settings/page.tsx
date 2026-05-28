// /settings page — renders the user settings management UI
import { auth } from '@/features/auth/auth';
import { redirect } from 'next/navigation';
import { SettingsPage } from '@/features/settings/SettingsPage';

export const metadata = { title: 'Settings' };

export default async function SettingsRoute() {
  const session = await auth();
  if (!session?.user) redirect('/');
  return (
    <SettingsPage
      userName={session.user.name ?? null}
      userEmail={session.user.email ?? null}
    />
  );
}
