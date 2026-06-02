// ExplanationScrollSections — All scroll-animated content sections and footer for the explanation page
'use client';

import { useScrollAnimation } from './useScrollAnimation';
import styles from './explanation.module.css';
import type { ExplanationScrollSectionsProps } from './ExplanationContent.types';

interface ScrollSectionProps {
  children: React.ReactNode;
  className?: string | undefined;
  delay?: number | undefined;
}

function ScrollSection({ children, className, delay }: ScrollSectionProps) {
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
      ref={ref}
      className={`${styles.scrollReveal} ${isVisible ? styles.visible : ''} ${delayClass} ${className ?? ''}`}
    >
      {children}
    </section>
  );
}

export function ExplanationScrollSections({ guestName, copy }: ExplanationScrollSectionsProps) {
  return (
    <>
      {/* Exclusivity — You were chosen */}
      <ScrollSection className={styles.section}>
        <p className={styles.exclusiveLabel}>{copy.byInvitation}</p>
        <div className={styles.separator} />
        <h2 className={styles.exclusiveTitle}>
          {copy.oneOfFiveLabel}
          <br />
          <span className={styles.exclusiveHighlight}>
            {copy.chosenFor(guestName)}
          </span>
        </h2>
        <div className={styles.separator} />
        <p className={styles.sectionBody}>{copy.exclusivityBody1}</p>
        <p className={styles.sectionBody}>{copy.exclusivityBody2}</p>
      </ScrollSection>

      {/* The event — What this gathering is about */}
      <ScrollSection className={styles.section}>
        <h2 className={styles.sectionTitle}>{copy.gatheringTitle}</h2>
        <p className={styles.sectionBody}>{copy.gatheringBody1}</p>
        <p className={styles.sectionBody}>{copy.gatheringBody2}</p>
      </ScrollSection>

      {/* The app — What LSA does */}
      <ScrollSection className={styles.section}>
        <p className={styles.exclusiveLabel}>{copy.introducing}</p>
        <div className={styles.separator} />
        <h2 className={styles.sectionTitle}>{copy.appTitle}</h2>
        <p className={styles.sectionBody}>{copy.appBody}</p>
        <ul className={styles.featureList}>
          <li className={styles.featureItem}>{copy.feature1}</li>
          <li className={styles.featureItem}>{copy.feature2}</li>
          <li className={styles.featureItem}>{copy.feature3}</li>
          <li className={styles.featureItem}>{copy.feature4}</li>
        </ul>
      </ScrollSection>

      {/* What to expect */}
      <ScrollSection className={styles.section}>
        <h2 className={styles.sectionTitle}>{copy.whatToExpect}</h2>
        <p className={styles.sectionBody}>{copy.expectBody1}</p>
        <p className={styles.sectionBody}>{copy.expectBody2}</p>
      </ScrollSection>

      {/* Closing */}
      <ScrollSection className={styles.section}>
        <div className={styles.separator} />
        <p className={styles.closingText}>
          {copy.closing.split('\n').map((line, i) => (
            <span key={i}>{line}{i === 0 && <br />}</span>
          ))}
        </p>
        <p className={styles.dateText}>{copy.date}</p>
      </ScrollSection>

      {/* Footer */}
      <footer className={styles.footer}>
        <p className={styles.footerText}>{copy.footer}</p>
      </footer>
    </>
  );
}
