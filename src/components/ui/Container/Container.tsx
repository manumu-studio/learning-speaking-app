// Content wrapper with max-width and padding
import type { ContainerProps } from './Container.types';

export function Container({ children, className = '' }: ContainerProps) {
  return (
    <div className={`max-w-4xl mx-auto px-4 py-6 ${className}`}>
      {children}
    </div>
  );
}
