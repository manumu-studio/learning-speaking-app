// LaunchContent — Client-side interactive launch page with countdown, theme toggle, and CSS animations
"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import styles from "./launch.module.css";
import { QrScanner } from "@/components/ui/QrScanner";

// Target date: February 25, 2026 at 14:00 local time
const LAUNCH_DATE = new Date(2026, 1, 25, 14, 0, 0);

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

function calculateTimeLeft(): TimeLeft {
  const now = new Date();
  const diff = LAUNCH_DATE.getTime() - now.getTime();

  if (diff <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0 };
  }

  return {
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((diff / (1000 * 60)) % 60),
    seconds: Math.floor((diff / 1000) % 60),
  };
}

// Extract token from either a full URL or a raw token string
function extractToken(input: string): string {
  try {
    const url = new URL(input.trim());
    return url.searchParams.get('token') ?? input.trim();
  } catch {
    return input.trim();
  }
}

export default function LaunchContent() {
  const router = useRouter();
  const [theme, setTheme] = useState<"light" | "dark">(() =>
    typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light'
  );
  const [timeLeft, setTimeLeft] = useState<TimeLeft>(calculateTimeLeft());
  const [mounted, setMounted] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [tokenInput, setTokenInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isValidating, setIsValidating] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  // Countdown interval
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  }, []);

  const pad = (n: number): string => String(n).padStart(2, "0");

  const closeModal = useCallback(() => {
    setShowModal(false);
    setTokenInput('');
    setError(null);
  }, []);

  const validateAndRedirect = useCallback(async (rawInput: string) => {
    const token = extractToken(rawInput);
    if (!token) return;

    setIsValidating(true);
    setError(null);

    try {
      const res = await fetch('/api/launch/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });

      if (res.ok) {
        router.push(`/explanation?token=${token}`);
      } else {
        setError('Invalid invitation code. Please try again.');
        setIsValidating(false);
      }
    } catch {
      setError('Something went wrong. Please try again.');
      setIsValidating(false);
    }
  }, [router]);

  const handleEnter = useCallback(() => {
    if (window.innerWidth < 768) {
      setShowScanner(true);
    } else {
      setShowModal(true);
    }
  }, []);

  const handleScan = useCallback((decodedText: string) => {
    setShowScanner(false);
    validateAndRedirect(decodedText);
  }, [validateAndRedirect]);

  const handleModalSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    validateAndRedirect(tokenInput);
  }, [tokenInput, validateAndRedirect]);

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
        {theme === "dark" ? "\u2600" : "\u263E"}
      </button>

      <div className={styles.content}>
        {/* Logo */}
        <div className={`${styles.animItem} ${styles.delay0}`}>
          <Image
            src={theme === "dark" ? "/assets/logo-white.webp" : "/assets/logo-black.webp"}
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
          A tutor that will always truly listens — then helps you<br />
          sound exactly the way you&apos;ve always wanted.
        </p>

        {/* Date */}
        <p className={`${styles.date} ${styles.animItem} ${styles.delay4}`}>
          February 25, 2026 &middot; 2:00 PM
        </p>

        {/* Countdown */}
        <div className={`${styles.countdown} ${styles.animItem} ${styles.delay5}`}>
          <div className={styles.countdownUnit}>
            <span className={styles.countdownNumber}>{pad(timeLeft.days)}</span>
            <span className={styles.countdownLabel}>Days</span>
          </div>
          <span className={styles.separator}>:</span>
          <div className={styles.countdownUnit}>
            <span className={styles.countdownNumber}>{pad(timeLeft.hours)}</span>
            <span className={styles.countdownLabel}>Hours</span>
          </div>
          <span className={styles.separator}>:</span>
          <div className={styles.countdownUnit}>
            <span className={styles.countdownNumber}>{pad(timeLeft.minutes)}</span>
            <span className={styles.countdownLabel}>Minutes</span>
          </div>
          <span className={styles.separator}>:</span>
          <div className={styles.countdownUnit}>
            <span className={styles.countdownNumber}>{pad(timeLeft.seconds)}</span>
            <span className={styles.countdownLabel}>Seconds</span>
          </div>
        </div>

        {/* CTA */}
        <button
          className={`${styles.cta} ${styles.animItem} ${styles.delay6}`}
          onClick={handleEnter}
        >
          Enter
        </button>
      </div>

      {/* Mobile: full-screen QR scanner */}
      {showScanner && (
        <QrScanner
          onScan={handleScan}
          onClose={() => setShowScanner(false)}
        />
      )}

      {/* Desktop: token input modal */}
      {showModal && (
        <div className={styles.modalOverlay} onClick={closeModal}>
          <div className={styles.modal} data-theme={theme} onClick={(e) => e.stopPropagation()}>
            <button className={styles.modalClose} onClick={closeModal} aria-label="Close">
              ✕
            </button>
            <p className={styles.modalTitle}>Enter your invitation code</p>
            <p className={styles.modalSubtitle}>Paste the code from your invitation card</p>
            <form onSubmit={handleModalSubmit} className={styles.tokenForm}>
              <input
                type="text"
                className={styles.tokenInput}
                placeholder="Your code"
                value={tokenInput}
                onChange={(e) => { setTokenInput(e.target.value); setError(null); }}
                autoFocus
                disabled={isValidating}
                autoComplete="off"
              />
              {error !== null && <p className={styles.errorMessage}>{error}</p>}
              <button
                type="submit"
                className={styles.cta}
                disabled={tokenInput.trim().length === 0 || isValidating}
              >
                {isValidating ? '···' : 'Continue'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
