// ExplanationContent — Personalized exclusive welcome experience with Apple-style scroll animations
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useScrollAnimation } from './useScrollAnimation';
import styles from './explanation.module.css';

interface ExplanationContentProps {
  guestName: string;
}

type Language = 'en' | 'es';

// All page copy, keyed by language
const COPY = {
  en: {
    privatePreview: 'Private Preview',
    welcome: 'Welcome,',
    byInvitation: 'By invitation only',
    oneOfFive: (name: string) => `One of five.\n${name}.`,
    oneOfFiveLabel: 'One of five.',
    chosenFor: (name: string) => `Chosen for ${name}.`,
    exclusivityBody1:
      'This is not a public launch. There is no waitlist, no open beta, no early access program. Five people were carefully selected to experience something before it exists for anyone else.',
    exclusivityBody2: 'You are one of them.',
    gatheringTitle: 'A private gathering.',
    gatheringBody1:
      'On March 6, 2026, at 2:00 PM — five people will sit together in a private setting to experience something entirely new. No audience. No cameras. Just a small group of people whose opinion matters most.',
    gatheringBody2:
      "This is the first time LSA will be used by anyone outside its creator. Your feedback, your reactions, your honest experience — that is the entire point.",
    introducing: 'Introducing',
    appTitle: 'LSA by ManuMu Studio',
    appBody:
      "A tutor that truly listens — then helps you sound exactly the way you've always wanted. LSA is a personal speaking coach powered by advanced AI that analyzes how you speak, identifies your unique patterns, and guides you toward the fluency you're after.",
    feature1: 'Speak naturally — LSA listens and transcribes in real time',
    feature2: 'Get deep analysis of your speaking patterns, habits, and growth areas',
    feature3: 'Receive personalized coaching that adapts to your unique voice',
    feature4: 'Track your progress across sessions as your fluency evolves',
    whatToExpect: 'What to expect.',
    expectBody1:
      'You will use LSA firsthand. You will speak, and the app will listen. You will see your analysis, your patterns, your path to improvement — all in real time.',
    expectBody2:
      "Then we talk. What worked. What didn't. What surprised you. Your experience will directly shape what LSA becomes.",
    closing: 'Thank you for being here.\nThis means more than you know.',
    date: 'March 6, 2026 · 2:00 PM',
    footer: 'LSA — ManuMu Studio',
    scroll: 'Scroll',
  },
  es: {
    privatePreview: 'Vista Previa Privada',
    welcome: 'Bienvenido,',
    byInvitation: 'Solo por invitación',
    oneOfFiveLabel: 'Uno de cinco.',
    chosenFor: (name: string) => `Elegido para ${name}.`,
    exclusivityBody1:
      'Este no es un lanzamiento público. No hay lista de espera, ni beta abierta, ni programa de acceso anticipado. Cinco personas fueron cuidadosamente seleccionadas para vivir algo antes de que exista para cualquier otra persona.',
    exclusivityBody2: 'Tú eres una de ellas.',
    gatheringTitle: 'Una reunión privada.',
    gatheringBody1:
      'El 6 de marzo de 2026, a las 2:00 PM — cinco personas se reunirán en un entorno privado para vivir algo completamente nuevo. Sin público. Sin cámaras. Solo un pequeño grupo de personas cuya opinión importa más.',
    gatheringBody2:
      'Esta es la primera vez que alguien fuera de su creador usará LSA. Tu opinión, tus reacciones, tu experiencia honesta — ese es el punto.',
    introducing: 'Presentamos',
    appTitle: 'LSA by ManuMu Studio',
    appBody:
      'Un tutor que realmente escucha — y luego te ayuda a sonar exactamente como siempre quisiste. LSA es un coach personal de conversación potenciado por IA avanzada que analiza cómo hablas, identifica tus patrones únicos y te guía hacia la fluidez que buscas.',
    feature1: 'Habla con naturalidad — LSA escucha y transcribe en tiempo real',
    feature2: 'Obtén un análisis profundo de tus patrones, hábitos y áreas de mejora',
    feature3: 'Recibe coaching personalizado que se adapta a tu voz única',
    feature4: 'Sigue tu progreso a lo largo de las sesiones mientras tu fluidez evoluciona',
    whatToExpect: 'Qué esperar.',
    expectBody1:
      'Usarás LSA de primera mano. Hablarás, y la app escuchará. Verás tu análisis, tus patrones, tu camino de mejora — todo en tiempo real.',
    expectBody2:
      'Luego conversamos. Qué funcionó. Qué no. Qué te sorprendió. Tu experiencia dará forma directamente a lo que LSA se convierte.',
    closing: 'Gracias por estar aquí.\nEsto significa más de lo que imaginas.',
    date: '6 de marzo de 2026 · 2:00 PM',
    footer: 'LSA — ManuMu Studio',
    scroll: 'Deslizar',
  },
} as const satisfies Record<Language, Record<string, string | ((name: string) => string)>>;

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
  const [lang, setLang] = useState<Language>('en');
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

  const toggleLang = useCallback(() => {
    setLang((prev) => (prev === 'en' ? 'es' : 'en'));
  }, []);

  // Prevent hydration mismatch
  if (!mounted) {
    return <div className={styles.page} data-theme="dark" />;
  }

  const t = COPY[lang];

  return (
    <div className={styles.page} data-theme={theme}>
      {/* Controls row */}
      <div className={styles.controls}>
        <button
          className={styles.langToggle}
          onClick={toggleLang}
          aria-label="Switch language"
        >
          {lang === 'en' ? 'ES' : 'EN'}
        </button>
        <button
          className={styles.themeToggle}
          onClick={toggleTheme}
          aria-label="Toggle theme"
        >
          {theme === 'dark' ? '\u2600' : '\u263E'}
        </button>
      </div>

      {/* ===== HERO — Full viewport dramatic entrance ===== */}
      <div className={styles.heroSection}>
        <p className={`${styles.exclusiveLabel} ${styles.heroAnim} ${styles.heroAnimDelay1}`}>
          {t.privatePreview}
        </p>
        <h1 className={`${styles.heroTitle} ${styles.heroAnim} ${styles.heroAnimDelay2}`}>
          {t.welcome}
        </h1>
        <p className={`${styles.heroName} ${styles.heroAnim} ${styles.heroAnimDelay3}`}>
          {guestName}.
        </p>

        {/* Scroll indicator */}
        <div className={styles.scrollIndicator}>
          <span className={styles.scrollIndicatorText}>{t.scroll}</span>
          <span className={styles.scrollArrow}>↓</span>
        </div>
      </div>

      {/* ===== EXCLUSIVITY — You were chosen ===== */}
      <ScrollSection className={styles.section}>
        <p className={styles.exclusiveLabel}>{t.byInvitation}</p>
        <div className={styles.separator} />
        <h2 className={styles.exclusiveTitle}>
          {t.oneOfFiveLabel}
          <br />
          <span className={styles.exclusiveHighlight}>
            {t.chosenFor(guestName)}
          </span>
        </h2>
        <div className={styles.separator} />
        <p className={styles.sectionBody}>{t.exclusivityBody1}</p>
        <p className={styles.sectionBody}>{t.exclusivityBody2}</p>
      </ScrollSection>

      {/* ===== THE EVENT — What this gathering is about ===== */}
      <ScrollSection className={styles.section}>
        <h2 className={styles.sectionTitle}>{t.gatheringTitle}</h2>
        <p className={styles.sectionBody}>{t.gatheringBody1}</p>
        <p className={styles.sectionBody}>{t.gatheringBody2}</p>
      </ScrollSection>

      {/* ===== THE APP — What LSA does ===== */}
      <ScrollSection className={styles.section}>
        <p className={styles.exclusiveLabel}>{t.introducing}</p>
        <div className={styles.separator} />
        <h2 className={styles.sectionTitle}>{t.appTitle}</h2>
        <p className={styles.sectionBody}>{t.appBody}</p>
        <ul className={styles.featureList}>
          <li className={styles.featureItem}>{t.feature1}</li>
          <li className={styles.featureItem}>{t.feature2}</li>
          <li className={styles.featureItem}>{t.feature3}</li>
          <li className={styles.featureItem}>{t.feature4}</li>
        </ul>
      </ScrollSection>

      {/* ===== WHAT TO EXPECT ===== */}
      <ScrollSection className={styles.section}>
        <h2 className={styles.sectionTitle}>{t.whatToExpect}</h2>
        <p className={styles.sectionBody}>{t.expectBody1}</p>
        <p className={styles.sectionBody}>{t.expectBody2}</p>
      </ScrollSection>

      {/* ===== CLOSING ===== */}
      <ScrollSection className={styles.section}>
        <div className={styles.separator} />
        <p className={styles.closingText}>
          {t.closing.split('\n').map((line, i) => (
            <span key={i}>{line}{i === 0 && <br />}</span>
          ))}
        </p>
        <p className={styles.dateText}>{t.date}</p>
      </ScrollSection>

      {/* Footer */}
      <footer className={styles.footer}>
        <p className={styles.footerText}>{t.footer}</p>
      </footer>
    </div>
  );
}
