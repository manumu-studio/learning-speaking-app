// Main navigation links with active state highlighting
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { MainNavProps } from './MainNav.types';

const navItems = [
  { href: '/session/new', label: 'New Session' },
  { href: '/prompts', label: 'Prompts' },
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/history', label: 'History' },
  { href: '/trends', label: 'Trends' },
  { href: '/drills', label: 'Training' },
] as const;

export function MainNav({ className = '' }: MainNavProps) {
  const pathname = usePathname();

  return (
    <nav aria-label="Main navigation" className={`flex space-x-3 sm:space-x-6 ${className}`}>
      {navItems.map(({ href, label }) => {
        const isActive =
          pathname === href ||
          pathname.startsWith(`${href}/`) ||
          (href === '/drills' && pathname.startsWith('/drill/'));
        return (
          <Link
            key={href}
            href={href}
            className={`text-xs sm:text-sm font-medium transition-colors whitespace-nowrap ${
              isActive
                ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400 pb-4'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 pb-4'
            }`}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
