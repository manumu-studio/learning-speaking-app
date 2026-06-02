// LaunchCountdown — Displays the days/hours/minutes/seconds countdown clock
'use client';

import styles from './launch.module.css';
import type { LaunchCountdownProps } from './LaunchCountdown.types';

export function LaunchCountdown({ timeLeft, pad, className }: LaunchCountdownProps) {
  return (
    <div className={`${styles.countdown} ${className ?? ''}`}>
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
  );
}
