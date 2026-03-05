// Public landing page with conditional CTAs based on auth state
import { CookieConsent } from '@/components/ui/CookieConsent';
import { auth, signIn } from '@/features/auth/auth';
import Link from 'next/link';

interface HomePageProps {
  searchParams: Promise<{ error?: string }>;
}

export default async function HomePage({ searchParams }: HomePageProps) {
  const session = await auth();
  const params = await searchParams;
  const error = params.error;

  return (
    <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-blue-50 to-indigo-100">
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
          <>
            {error && (
              <div className="w-full max-w-md mx-auto rounded-md bg-red-50 p-4 text-sm text-red-800 mb-6">
                Authentication failed. Please try again.
              </div>
            )}

            <form
              action={async () => {
                'use server';
                await signIn('manumustudio', { redirectTo: '/session/new' });
              }}
              className="w-full max-w-md mx-auto"
            >
              <button
                type="submit"
                className="w-full rounded-lg bg-blue-600 px-8 py-3 text-lg font-semibold text-white transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                Sign in with ManuMuStudio
              </button>
            </form>

            <div className="text-sm text-gray-500 mt-4">
              Don&apos;t have an account?{' '}
              <form
                action={async () => {
                  'use server';
                  await signIn('manumustudio', { redirectTo: '/session/new' }, { mode: 'signup' });
                }}
                className="inline"
              >
                <button
                  type="submit"
                  className="text-blue-600 hover:underline"
                >
                  Create one here
                </button>
              </form>
            </div>
          </>
        )}
      </div>
      <CookieConsent />
    </div>
  );
}
