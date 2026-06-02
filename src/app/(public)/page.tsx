// Public landing page with animated canvas background and scrollable sections
import { CookieConsent } from '@/components/ui/CookieConsent';
import { FeatureShowcase } from '@/components/landing/FeatureShowcase';
import { HowItWorks } from '@/components/landing/HowItWorks';
import { CtaFooter } from '@/components/landing/CtaFooter';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { auth, signIn } from '@/features/auth/auth';
import { HomeHero } from './HomeHero';

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
    <main id="main-content" className="bg-white dark:bg-black transition-colors duration-200">
      {/* Theme toggle — fixed top-right on landing */}
      <div className="fixed top-4 right-4 z-50">
        <ThemeToggle className="h-8 w-8 shadow-md" />
      </div>

      <HomeHero
        isAuthenticated={isAuthenticated}
        error={error}
        signInAction={handleSignIn}
      />

      {/* === Scrollable Sections === */}
      <FeatureShowcase />
      <HowItWorks />
      <CtaFooter isAuthenticated={isAuthenticated} signInAction={handleSignIn} />

      <CookieConsent />
    </main>
  );
}
