// Top navigation bar with logo, app nav, theme toggle, and user menu
'use client';

import Image from 'next/image';
import { MainNav } from '@/components/ui/MainNav';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import type { TopBarProps } from './TopBar.types';

export function TopBar({ userName, userEmail }: TopBarProps) {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Left: Logo + nav */}
          <div className="flex items-center space-x-8">
            <div className="flex items-center">
              <Image
                src="/assets/logo-black.webp"
                alt="Learning Speaking App"
                width={120}
                height={32}
                className="h-8 w-auto dark:hidden"
                priority
              />
              <Image
                src="/assets/logo-white.webp"
                alt="Learning Speaking App"
                width={120}
                height={32}
                className="h-8 w-auto hidden dark:block"
                priority
              />
            </div>
            <MainNav />
          </div>

          {/* Right: theme toggle + user info + sign out */}
          <div className="flex items-center space-x-4">
            <ThemeToggle className="h-7 w-7" />

            {(userName || userEmail) && (
              <div className="text-sm text-right">
                {userName && (
                  <div className="font-medium text-gray-900 dark:text-gray-100">{userName}</div>
                )}
                {userEmail && (
                  <div className="text-gray-500 dark:text-gray-400">{userEmail}</div>
                )}
              </div>
            )}
            <button
              onClick={() => window.location.href = '/api/auth/federated-signout'}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
