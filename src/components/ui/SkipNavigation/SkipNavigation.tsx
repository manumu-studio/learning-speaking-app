// Skip link for keyboard users — visually hidden until focused
import type { SkipNavigationProps } from './SkipNavigation.types';

export function SkipNavigation({
  targetId = 'main-content',
  label = 'Skip to main content',
}: SkipNavigationProps) {
  return (
    <a
      href={`#${targetId}`}
      className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-white focus:text-black focus:rounded-md focus:shadow-lg dark:focus:bg-zinc-900 dark:focus:text-white"
    >
      {label}
    </a>
  );
}
