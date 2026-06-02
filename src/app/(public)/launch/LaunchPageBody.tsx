// LaunchPageBody — Main visible content of the launch page: logo, hero text, countdown, and enter CTA
'use client';

import Image from 'next/image';
import styles from './launch.module.css';
import { LaunchCountdown } from './LaunchCountdown';
import type { LaunchPageBodyProps } from './LaunchPageBody.types';

export function LaunchPageBody({ theme, timeLeft, pad, onToggleTheme, onEnter }: LaunchPageBodyProps) {
  return (
    <>
      {/* Theme toggle */}
      <button
        className={styles.themeToggle}
        onClick={onToggleTheme}
        aria-label="Toggle theme"
      >
        {theme === 'dark' ? '☀' : '☾'}
      </button>

      <div className={styles.content}>
        {/* Logo */}
        <div className={`${styles.animItem} ${styles.delay0}`}>
          <Image
            src={theme === 'dark' ? '/assets/logo-white.webp' : '/assets/logo-black.webp'}
            alt="ManuMu Studio"
            width={88}
            height={88}
            className={styles.logo}
            priority
          />
        </div>

        {/* Hero */}
        <h1 className={`${styles.hero} ${styles.animItem} ${styles.delay1}`}>
          LSA
        </h1>

        {/* Subtitle */}
        <p className={`${styles.subtitle} ${styles.animItem} ${styles.delay2}`}>
          by ManuMu Studio
        </p>

        {/* Tagline */}
        <p className={`${styles.tagline} ${styles.animItem} ${styles.delay3}`}>
          A tutor that will always truly listen — then helps you<br />
          sound exactly the way you&apos;ve always wanted.
        </p>

        {/* Date */}
        <p className={`${styles.date} ${styles.animItem} ${styles.delay4}`}>
          March 6, 2026 &middot; 2:00 PM
        </p>

        {/* Countdown */}
        <LaunchCountdown
          timeLeft={timeLeft}
          pad={pad}
          className={`${styles.animItem} ${styles.delay5}`}
        />

        {/* CTA */}
        <button
          className={`${styles.cta} ${styles.animItem} ${styles.delay6}`}
          onClick={onEnter}
        >
          Enter
        </button>
      </div>
    </>
  );
}
