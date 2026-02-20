// ExplanationContent — Personalized exclusive welcome experience with Apple-style scroll animations
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useScrollAnimation } from './useScrollAnimation';
import styles from './explanation.module.css';

interface ExplanationContentProps {
  guestName: string;
}

// Scroll-animated section wrapper
function ScrollSection({
  children,
  className,
  delay,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const { ref, isVisible } = useScrollAnimation();

  const delayClass =
    delay === 1
      ? styles.scrollDelay1
      : delay === 2
        ? styles.scrollDelay2
        : delay === 3
          ? styles.scrollDelay3
          : '';

  return (
    <section
      ref={ref as React.RefObject<HTMLElement>}
      className={`${styles.scrollReveal} ${isVisible ? styles.visible : ''} ${delayClass} ${className ?? ''}`}
    >
      {children}
    </section>
  );
}

export default function ExplanationContent({ guestName }: ExplanationContentProps) {
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [mounted, setMounted] = useState(false);

  // Detect system preference on mount
  useEffect(() => {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- SSR hydration: detect system preference after mount
    setTheme(prefersDark ? 'dark' : 'light');
    setMounted(true);
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  }, []);

  // Prevent hydration mismatch
  if (!mounted) {
    return <div className={styles.page} data-theme="dark" />;
  }

  return (
    <div className={styles.page} data-theme={theme}>
      {/* Theme toggle */}
      <button
        className={styles.themeToggle}
        onClick={toggleTheme}
        aria-label="Toggle theme"
      >
        {theme === 'dark' ? '\u2600' : '\u263E'}
      </button>

      {/* ===== HERO — Full viewport dramatic entrance ===== */}
      <div className={styles.heroSection}>
        <p className={`${styles.exclusiveLabel} ${styles.heroAnim} ${styles.heroAnimDelay1}`}>
          Private Preview
        </p>
        <h1 className={`${styles.heroTitle} ${styles.heroAnim} ${styles.heroAnimDelay2}`}>
          Welcome,
        </h1>
        <p className={`${styles.heroName} ${styles.heroAnim} ${styles.heroAnimDelay3}`}>
          {guestName}.
        </p>

        {/* Scroll indicator */}
        <div className={styles.scrollIndicator}>
          <span className={styles.scrollIndicatorText}>Scroll</span>
          <span className={styles.scrollArrow}>↓</span>
        </div>
      </div>

      {/* ===== EXCLUSIVITY — You were chosen ===== */}
      <ScrollSection className={styles.section}>
        <p className={styles.exclusiveLabel}>By invitation only</p>
        <div className={styles.separator} />
        <h2 className={styles.exclusiveTitle}>
          One of five.
          <br />
          <span className={styles.exclusiveHighlight}>
            Chosen for {guestName}.
          </span>
        </h2>
        <div className={styles.separator} />
        <p className={styles.sectionBody}>
          This is not a public launch. There is no waitlist, no open beta, no
          early access program. Five people were carefully selected to experience
          something before it exists for anyone else.
        </p>
        <p className={styles.sectionBody}>
          You are one of them.
        </p>
      </ScrollSection>

      {/* ===== THE EVENT — What this gathering is about ===== */}
      <ScrollSection className={styles.section}>
        <h2 className={styles.sectionTitle}>
          A private gathering.
        </h2>
        <p className={styles.sectionBody}>
          On February 26, 2026, at 2:00 PM — five people will sit together in a
          private setting to experience something entirely new. No audience. No
          cameras. Just a small group of people whose opinion matters most.
        </p>
        <p className={styles.sectionBody}>
          This is the first time LSA will be used by anyone outside its creator.
          Your feedback, your reactions, your honest experience — that is the
          entire point.
        </p>
      </ScrollSection>

      {/* ===== THE APP — What LSA does ===== */}
      <ScrollSection className={styles.section}>
        <p className={styles.exclusiveLabel}>Introducing</p>
        <div className={styles.separator} />
        <h2 className={styles.sectionTitle}>
          LSA by ManuMu Studio
        </h2>
        <p className={styles.sectionBody}>
          A tutor that truly listens — then helps you sound exactly the way
          you&apos;ve always wanted. LSA is a personal speaking coach powered by
          advanced AI that analyzes how you speak, identifies your unique
          patterns, and guides you toward the fluency you&apos;re after.
        </p>
        <ul className={styles.featureList}>
          <li className={styles.featureItem}>
            Speak naturally — LSA listens and transcribes in real time
          </li>
          <li className={styles.featureItem}>
            Get deep analysis of your speaking patterns, habits, and growth areas
          </li>
          <li className={styles.featureItem}>
            Receive personalized coaching that adapts to your unique voice
          </li>
          <li className={styles.featureItem}>
            Track your progress across sessions as your fluency evolves
          </li>
        </ul>
      </ScrollSection>

      {/* ===== WHAT TO EXPECT ===== */}
      <ScrollSection className={styles.section}>
        <h2 className={styles.sectionTitle}>
          What to expect.
        </h2>
        <p className={styles.sectionBody}>
          You will use LSA firsthand. You will speak, and the app will listen.
          You will see your analysis, your patterns, your path to improvement —
          all in real time.
        </p>
        <p className={styles.sectionBody}>
          Then we talk. What worked. What didn&apos;t. What surprised you. Your
          experience will directly shape what LSA becomes.
        </p>
      </ScrollSection>

      {/* ===== CLOSING ===== */}
      <ScrollSection className={styles.section}>
        <div className={styles.separator} />
        <p className={styles.closingText}>
          Thank you for being here.
          <br />
          This means more than you know.
        </p>
        <p className={styles.dateText}>
          February 26, 2026 · 2:00 PM
        </p>
      </ScrollSection>

      {/* Footer */}
      <footer className={styles.footer}>
        <p className={styles.footerText}>
          LSA — ManuMu Studio
        </p>
      </footer>
    </div>
  );
}
