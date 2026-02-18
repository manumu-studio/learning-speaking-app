// New session page (protected route)
import { auth } from '@/features/auth';

export default async function NewSessionPage() {
  const session = await auth();

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-3xl font-bold text-gray-900">New Speaking Session</h1>
      <div className="rounded-lg bg-white p-6 shadow">
        <p className="text-gray-600">
          Welcome, {session?.user?.name ?? 'User'}! This is a protected route.
        </p>
        <p className="mt-4 text-sm text-gray-500">
          Session creation will be implemented in the next phase.
        </p>
      </div>
    </div>
  );
}
