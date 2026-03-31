// Public landing page with animated canvas background and scrollable sections
import { CookieConsent } from '@/components/ui/CookieConsent';
import { HeroCanvas } from '@/components/ui/HeroCanvas';
import { FeatureShowcase } from '@/components/landing/FeatureShowcase';
import { HowItWorks } from '@/components/landing/HowItWorks';
import { CtaFooter } from '@/components/landing/CtaFooter';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { auth, signIn } from '@/features/auth/auth';
import Image from 'next/image';
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

  const handleSignIn = async () => {
    'use server';
    await signIn('manumustudio', { redirectTo: '/session/new' });
  };

  return (
    <main className="bg-white dark:bg-black transition-colors duration-200">
      {/* Theme toggle — fixed top-right on landing */}
      <div className="fixed top-4 right-4 z-50">
        <ThemeToggle className="h-8 w-8 shadow-md" />
      </div>

      {/* === Hero Section === */}
      <div className="relative min-h-screen flex items-center justify-center overflow-hidden">
        <HeroCanvas />

        <div className="relative z-10 max-w-2xl mx-auto px-4 text-center">
          {/* Logo */}
          <div
            className="flex justify-center mb-8"
            style={{ animation: 'fadeInUp 0.8s ease forwards', animationDelay: '0.1s', opacity: 0 }}
          >
            <Image
              src="/assets/logo-white.webp"
              alt="Learning Speaking App"
              width={160}
              height={48}
              className="h-12 w-auto dark:block hidden"
              priority
            />
            <Image
              src="/assets/logo-black.webp"
              alt="Learning Speaking App"
              width={160}
              height={48}
              className="h-12 w-auto block dark:hidden"
              priority
            />
          </div>

          <p
            className="text-sm tracking-widest uppercase text-black/60 dark:text-white/60 mb-4"
            style={{ animation: 'fadeInUp 0.8s ease forwards', animationDelay: '0.2s', opacity: 0 }}
          >
            AI-Powered English Coach
          </p>

          <h1
            className="text-6xl md:text-7xl font-black text-black dark:text-white mb-2 tracking-tight"
            style={{ animation: 'fadeInUp 0.8s ease forwards', animationDelay: '0.4s', opacity: 0 }}
          >
            LEARNING
          </h1>
          <h1
            className="text-6xl md:text-7xl font-black text-black dark:text-white mb-6 tracking-tight"
            style={{ animation: 'fadeInUp 0.8s ease forwards', animationDelay: '0.5s', opacity: 0 }}
          >
            SPEAKING APP
          </h1>

          <p
            className="text-lg text-black/70 dark:text-white/70 mb-10 italic max-w-md mx-auto"
            style={{ animation: 'fadeInUp 0.8s ease forwards', animationDelay: '0.7s', opacity: 0 }}
          >
            Practice speaking naturally. Get AI-powered feedback on fluency, clarity, and communication patterns.
          </p>

          <div style={{ animation: 'fadeInUp 0.8s ease forwards', animationDelay: '0.9s', opacity: 0 }}>
            {isAuthenticated ? (
              <Link
                href="/session/new"
                className="inline-block px-8 py-3 text-lg font-medium text-white dark:text-black bg-black dark:bg-white rounded-full hover:bg-black/80 dark:hover:bg-white/90 transition focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black/50 dark:focus:ring-white/50"
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
                    className="w-full rounded-full bg-black dark:bg-white px-8 py-3 text-lg font-semibold text-white dark:text-black transition hover:bg-black/80 dark:hover:bg-white/90 focus:outline-none focus:ring-2 focus:ring-black/50 dark:focus:ring-white/50 focus:ring-offset-2"
                    pendingText="Signing in..."
                  >
                    Sign in with ManuMuStudio
                  </SubmitButton>
                </form>

                <div className="text-sm text-black/50 dark:text-white/50 mt-4">
                  Don&apos;t have an account?{' '}
                  <form
                    action={async () => {
                      'use server';
                      await signIn('manumustudio', { redirectTo: '/session/new' }, { mode: 'signup' });
                    }}
                    className="inline"
                  >
                    <SubmitButton
                      className="text-black/80 dark:text-white/80 hover:text-black dark:hover:text-white hover:underline transition"
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
