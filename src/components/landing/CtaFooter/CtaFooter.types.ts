// CtaFooter section type definitions
export interface CtaFooterProps {
  /** Whether user is already authenticated */
  isAuthenticated: boolean;
  /** Server action to trigger sign-in (passed from server component) */
  signInAction: () => Promise<void>;
  /** Optional className for the section wrapper */
  className?: string;
}
