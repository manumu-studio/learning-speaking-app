// Landing page bottom CTA section driving sign-up conversion
'use client';

import Link from 'next/link';
import { ScrollReveal } from '@/components/ui/ScrollReveal';
import type { CtaFooterProps } from './CtaFooter.types';

export function CtaFooter({ isAuthenticated, signInAction, className = '' }: CtaFooterProps) {
  return (
    <section className={`py-24 md:py-32 bg-zinc-950 ${className}`}>
      <div className="max-w-3xl mx-auto px-4 text-center">
        <ScrollReveal>
          <p className="text-sm tracking-widest uppercase text-white/40 mb-4">
            Ready?
          </p>
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
            Start speaking better today
          </h2>
          <p className="text-lg text-white/60 mb-10 max-w-xl mx-auto">
            No credit card required. Record your first session and get instant AI-powered feedback on your English speaking skills.
          </p>
        </ScrollReveal>

        <ScrollReveal delay={200}>
          {isAuthenticated ? (
            <Link
              href="/session/new"
              className="inline-block px-10 py-4 text-lg font-semibold text-black bg-white rounded-full hover:bg-white/90 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-white/50 focus:ring-offset-black"
            >
              Go to Dashboard
            </Link>
          ) : (
            <form action={signInAction}>
              <button
                type="submit"
                className="px-10 py-4 text-lg font-semibold text-black bg-white rounded-full hover:bg-white/90 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-white/50 focus:ring-offset-2 focus:ring-offset-black cursor-pointer"
              >
                Get Started Free
              </button>
            </form>
          )}
        </ScrollReveal>

        {/* Footer attribution */}
        <ScrollReveal delay={400}>
          <p className="text-xs tracking-widest uppercase text-white/20 mt-16">
            by ManuMu Studio
          </p>
        </ScrollReveal>
      </div>
    </section>
  );
}
