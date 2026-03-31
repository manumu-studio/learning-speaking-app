// Reusable loading spinner with size variants
import type { LoadingSpinnerProps } from './LoadingSpinner.types';

const sizeClasses = {
  sm: 'h-4 w-4 border-2',
  md: 'h-8 w-8 border-4',
  lg: 'h-12 w-12 border-4',
} satisfies Record<string, string>;

export function LoadingSpinner({
  size = 'md',
  className = '',
}: LoadingSpinnerProps) {
  return (
    <div
      role="status"
      aria-label="Loading"
      className={`animate-spin rounded-full border-blue-500 border-t-transparent ${sizeClasses[size]} ${className}`}
    />
  );
}
