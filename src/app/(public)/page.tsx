// Public landing page with animated canvas background and scrollable sections
import { CookieConsent } from '@/components/ui/CookieConsent';
import { HeroCanvas } from '@/components/ui/HeroCanvas';
import { FeatureShowcase } from '@/components/landing/FeatureShowcase';
import { HowItWorks } from '@/components/landing/HowItWorks';
import { CtaFooter } from '@/components/landing/CtaFooter';
import { auth, signIn } from '@/features/auth/auth';
import Link from 'next/link';
import { SubmitButton } from '@/components/ui/SubmitButton';

interface HomePageProps {
  searchParams: Promise<{ error?: string }>;
}

export default async function HomePage({ searchParams }: HomePageProps) {
  const session = await auth();
  const params = await searchParams;
  const error = params.error;
  const isAuthenticated = !!session?.user;

  // Server action for sign-in (passed to client components)
  const handleSignIn = async () => {
    'use server';
    await signIn('manumustudio', { redirectTo: '/session/new' });
  };

  return (
    <main className="bg-black">
      {/* === Hero Section === */}
      <div className="relative min-h-screen flex items-center justify-center overflow-hidden">
        <HeroCanvas />

        <div className="relative z-10 max-w-2xl mx-auto px-4 text-center">
          <p
            className="text-sm tracking-widest uppercase text-white/60 mb-4"
            style={{ animation: 'fadeInUp 0.8s ease forwards', animationDelay: '0.2s', opacity: 0 }}
          >
            AI-Powered English Coach
          </p>

          <h1
            className="text-6xl md:text-7xl font-black text-white mb-2 tracking-tight"
            style={{ animation: 'fadeInUp 0.8s ease forwards', animationDelay: '0.4s', opacity: 0 }}
          >
            LEARNING
          </h1>
          <h1
            className="text-6xl md:text-7xl font-black text-white mb-6 tracking-tight"
            style={{ animation: 'fadeInUp 0.8s ease forwards', animationDelay: '0.5s', opacity: 0 }}
          >
            SPEAKING APP
          </h1>

          <p
            className="text-lg text-white/70 mb-10 italic max-w-md mx-auto"
            style={{ animation: 'fadeInUp 0.8s ease forwards', animationDelay: '0.7s', opacity: 0 }}
          >
            Practice speaking naturally. Get AI-powered feedback on fluency, clarity, and communication patterns.
          </p>

          <div style={{ animation: 'fadeInUp 0.8s ease forwards', animationDelay: '0.9s', opacity: 0 }}>
            {isAuthenticated ? (
              <Link
                href="/session/new"
                className="inline-block px-8 py-3 text-lg font-medium text-black bg-white rounded-full hover:bg-white/90 transition focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-white/50"
              >
                Go to Dashboard
              </Link>
            ) : (
              <>
                {error && (
                  <div className="w-full max-w-md mx-auto rounded-md bg-red-900/50 border border-red-500/30 p-4 text-sm text-red-200 mb-6">
                    Authentication failed. Please try again.
                  </div>
                )}

                <form action={handleSignIn} className="w-full max-w-md mx-auto">
                  <SubmitButton
                    className="w-full rounded-full bg-white px-8 py-3 text-lg font-semibold text-black transition hover:bg-white/90 focus:outline-none focus:ring-2 focus:ring-white/50 focus:ring-offset-2 focus:ring-offset-black"
                    pendingText="Signing in..."
                  >
                    Sign in with ManuMuStudio
                  </SubmitButton>
                </form>

                <div className="text-sm text-white/50 mt-4">
                  Don&apos;t have an account?{' '}
                  <form
                    action={async () => {
                      'use server';
                      await signIn('manumustudio', { redirectTo: '/session/new' }, { mode: 'signup' });
                    }}
                    className="inline"
                  >
                    <SubmitButton
                      className="text-white/80 hover:text-white hover:underline transition"
                      pendingText="Redirecting..."
                    >
                      Create one here
                    </SubmitButton>
                  </form>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* === Scrollable Sections === */}
      <FeatureShowcase />
      <HowItWorks />
      <CtaFooter isAuthenticated={isAuthenticated} signInAction={handleSignIn} />

      <CookieConsent />
    </main>
  );
}
