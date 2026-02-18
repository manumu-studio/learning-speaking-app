// Public landing page with conditional CTAs based on auth state
import { auth } from '@/features/auth/auth';
import Link from 'next/link';

export default async function HomePage() {
  const session = await auth();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-2xl mx-auto px-4 text-center">
        <h1 className="text-5xl font-bold text-gray-900 mb-6">
          Learning Speaking App
        </h1>
        <p className="text-xl text-gray-700 mb-8">
          Practice speaking naturally. Get AI-powered feedback on fluency,
          clarity, and communication patterns.
        </p>

        {session?.user ? (
          <Link
            href="/session/new"
            className="inline-block px-8 py-3 text-lg font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Go to Dashboard
          </Link>
        ) : (
          <Link
            href="/auth/signin"
            className="inline-block px-8 py-3 text-lg font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Sign In to Start
          </Link>
        )}
      </div>
    </div>
  );
}
