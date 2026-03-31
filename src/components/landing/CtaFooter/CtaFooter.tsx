// Landing page bottom CTA section driving sign-up conversion
'use client';

import Link from 'next/link';
import { ScrollReveal } from '@/components/ui/ScrollReveal';
import { SubmitButton } from '@/components/ui/SubmitButton';
import type { CtaFooterProps } from './CtaFooter.types';

export function CtaFooter({ isAuthenticated, signInAction, className = '' }: CtaFooterProps) {
  return (
    <section className={`py-24 md:py-32 bg-gray-50 dark:bg-zinc-950 transition-colors duration-200 ${className}`}>
      <div className="max-w-3xl mx-auto px-4 text-center">
        <ScrollReveal>
          <p className="text-sm tracking-widest uppercase text-black/40 dark:text-white/40 mb-4">
            Ready?
          </p>
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-6">
            Start speaking better today
          </h2>
          <p className="text-lg text-gray-600 dark:text-white/60 mb-10 max-w-xl mx-auto">
            No credit card required. Record your first session and get instant AI-powered feedback on your English speaking skills.
          </p>
        </ScrollReveal>

        <ScrollReveal delay={200}>
          {isAuthenticated ? (
            <Link
              href="/session/new"
              className="inline-block px-10 py-4 text-lg font-semibold text-white dark:text-black bg-black dark:bg-white rounded-full hover:bg-black/80 dark:hover:bg-white/90 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black/50 dark:focus:ring-white/50"
            >
              Go to Dashboard
            </Link>
          ) : (
            <form action={signInAction}>
              <SubmitButton
                className="px-10 py-4 text-lg font-semibold text-white dark:text-black bg-black dark:bg-white rounded-full hover:bg-black/80 dark:hover:bg-white/90 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-black/50 dark:focus:ring-white/50 focus:ring-offset-2 cursor-pointer"
                pendingText="Signing in..."
              >
                Get Started Free
              </SubmitButton>
            </form>
          )}
        </ScrollReveal>

        <ScrollReveal delay={400}>
          <p className="text-xs tracking-widest uppercase text-black/20 dark:text-white/20 mt-16">
            by ManuMu Studio
          </p>
        </ScrollReveal>
      </div>
    </section>
  );
}
