// Types for the ErrorBoundary component
import type { ReactNode } from 'react';

/** Wraps a subtree with a React error boundary; optional fallback replaces children on throw. */
export interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

/** Next.js App Router `error.tsx` contract — `digest` may be present for logged server errors. */
export interface AppRouterErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}
