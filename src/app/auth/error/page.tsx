// Authentication error page
import Link from 'next/link';

interface AuthErrorPageProps {
  searchParams: Promise<{ error?: string }>;
}

export default async function AuthErrorPage({ searchParams }: AuthErrorPageProps) {
  const params = await searchParams;
  const error = params.error ?? 'Unknown error';

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-red-50 to-white">
      <div className="container flex max-w-md flex-col items-center gap-6 rounded-lg bg-white p-8 shadow-lg">
        <div className="text-6xl">⚠️</div>
        <h1 className="text-2xl font-bold text-gray-900">Authentication Error</h1>
        <p className="text-center text-gray-600">
          We encountered an error while signing you in.
        </p>
        <div className="w-full rounded-md bg-gray-50 p-4">
          <code className="text-sm text-gray-700">{error}</code>
        </div>
        <Link
          href="/auth/signin"
          className="rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white transition hover:bg-blue-700"
        >
          Try Again
        </Link>
      </div>
    </div>
  );
}
