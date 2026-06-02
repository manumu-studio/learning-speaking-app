// ExplanationHero — Full-viewport hero entrance for the personalized explanation page
'use client';

import styles from './explanation.module.css';
import type { ExplanationHeroProps } from './ExplanationContent.types';

export function ExplanationHero({ guestName, copy }: ExplanationHeroProps) {
  return (
    <div className={styles.heroSection}>
      <p className={`${styles.exclusiveLabel} ${styles.heroAnim} ${styles.heroAnimDelay1}`}>
        {copy.privatePreview}
      </p>
      <h1 className={`${styles.heroTitle} ${styles.heroAnim} ${styles.heroAnimDelay2}`}>
        {copy.welcome}
      </h1>
      <p className={`${styles.heroName} ${styles.heroAnim} ${styles.heroAnimDelay3}`}>
        {guestName}.
      </p>
      {/* Scroll indicator */}
      <div className={styles.scrollIndicator}>
        <span className={styles.scrollIndicatorText}>{copy.scroll}</span>
        <span className={styles.scrollArrow}>↓</span>
      </div>
    </div>
  );
}
