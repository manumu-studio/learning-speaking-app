// Types for the ErrorBoundary component
import type { ReactNode } from 'react';

export interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

export interface AppRouterErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}
