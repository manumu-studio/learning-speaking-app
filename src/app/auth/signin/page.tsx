// Sign-in page with OAuth provider
import { signIn } from '@/features/auth/auth';

interface SignInPageProps {
  searchParams: Promise<{ callbackUrl?: string; error?: string }>;
}

export default async function SignInPage({ searchParams }: SignInPageProps) {
  const params = await searchParams;
  const callbackUrl = params.callbackUrl ?? '/session/new';
  const error = params.error;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-blue-50 to-white">
      <div className="container flex max-w-md flex-col items-center gap-8 rounded-lg bg-white p-8 shadow-lg">
        <h1 className="text-3xl font-bold text-gray-900">Sign In</h1>

        {error && (
          <div className="w-full rounded-md bg-red-50 p-4 text-sm text-red-800">
            Authentication failed. Please try again.
          </div>
        )}

        <p className="text-center text-gray-600">
          Sign in with your ManuMuStudio account to continue
        </p>

        <form
          action={async () => {
            'use server';
            await signIn('manumustudio', { redirectTo: callbackUrl });
          }}
          className="w-full"
        >
          <button
            type="submit"
            className="w-full rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Sign in with ManuMuStudio
          </button>
        </form>

        <p className="text-sm text-gray-500">
          Don&apos;t have an account?{' '}
          <a
            href="https://auth.manumustudio.com/?mode=signup"
            className="text-blue-600 hover:underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            Create one here
          </a>
        </p>
      </div>
    </div>
  );
}
