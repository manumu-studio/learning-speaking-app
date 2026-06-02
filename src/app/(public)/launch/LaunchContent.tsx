// LaunchContent — Client-side interactive launch page with countdown, theme toggle, and CSS animations
"use client";

import { useState, useEffect, useCallback } from "react";
import styles from "./launch.module.css";
import { QrScanner } from "@/components/ui/QrScanner";
import { LaunchPageBody } from "./LaunchPageBody";
import { LaunchTokenModal } from "./LaunchTokenModal";
import { useLaunchValidation } from "./useLaunchValidation";
import type { TimeLeft } from "./LaunchCountdown.types";

// Target date: March 6, 2026 at 14:00 local time
const LAUNCH_DATE = new Date(2026, 2, 6, 14, 0, 0);

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

const pad = (n: number): string => String(n).padStart(2, "0");

export default function LaunchContent() {
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
  const { error, isValidating, validateAndRedirect, clearError } = useLaunchValidation();

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => { setTimeLeft(calculateTimeLeft()); }, 1000);
    return () => clearInterval(timer);
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  }, []);

  const closeModal = useCallback(() => {
    setShowModal(false);
    setTokenInput('');
    clearError();
  }, [clearError]);

  const handleEnter = useCallback(() => {
    if (window.innerWidth < 768) { setShowScanner(true); } else { setShowModal(true); }
  }, []);

  const handleScan = useCallback((decodedText: string) => {
    setShowScanner(false);
    validateAndRedirect(decodedText);
  }, [validateAndRedirect]);

  const handleModalSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    validateAndRedirect(tokenInput);
  }, [tokenInput, validateAndRedirect]);

  const handleTokenChange = useCallback((value: string) => {
    setTokenInput(value);
    clearError();
  }, [clearError]);

  if (!mounted) {
    return <div className={styles.page} data-theme="dark" />;
  }

  return (
    <div className={styles.page} data-theme={theme}>
      <LaunchPageBody
        theme={theme}
        timeLeft={timeLeft}
        pad={pad}
        onToggleTheme={toggleTheme}
        onEnter={handleEnter}
      />
      {showScanner && (
        <QrScanner onScan={handleScan} onClose={() => setShowScanner(false)} />
      )}
      {showModal && (
        <LaunchTokenModal
          theme={theme}
          tokenInput={tokenInput}
          error={error}
          isValidating={isValidating}
          onClose={closeModal}
          onTokenChange={handleTokenChange}
          onSubmit={handleModalSubmit}
        />
      )}
    </div>
  );
}
