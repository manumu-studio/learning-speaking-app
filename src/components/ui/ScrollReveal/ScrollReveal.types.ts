// ScrollReveal component type definitions
export interface ScrollRevealProps {
  children: React.ReactNode;
  className?: string;
  /** Delay in milliseconds before animation starts */
  delay?: number;
  /** IntersectionObserver threshold (0-1) */
  threshold?: number;
}
