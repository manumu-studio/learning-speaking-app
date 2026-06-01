// Shared utility functions
import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merges Tailwind class names, resolving conflicts via tailwind-merge.
 *
 * Accepts any combination of strings, arrays, objects, and conditional values
 * (everything `clsx` accepts), then passes the result through `tailwind-merge`
 * so later classes win over earlier conflicting utilities.
 *
 * @param inputs - Class values to combine (strings, arrays, objects, falsy values).
 * @returns A single space-separated class string with Tailwind conflicts resolved.
 * @example
 * cn('px-4 py-2', condition && 'bg-blue-500', 'px-6')
 * // => 'py-2 bg-blue-500 px-6'  (px-4 overridden by px-6)
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
