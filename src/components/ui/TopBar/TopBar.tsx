// Top navigation bar with logo, app nav, theme toggle, and user menu
'use client';

import Image from 'next/image';
import { MainNav } from '@/components/ui/MainNav';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import type { TopBarProps } from './TopBar.types';

export function TopBar({ userName, userEmail }: TopBarProps) {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/95 dark:bg-black/95 backdrop-blur-md border-b border-gray-200 dark:border-gray-800 transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14 sm:h-16">
          {/* Left: Logo + nav */}
          <div className="flex items-center space-x-4 sm:space-x-8">
            <div className="hidden sm:flex items-center">
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
          <div className="flex items-center space-x-2 sm:space-x-4">
            <ThemeToggle className="h-6 w-6 sm:h-7 sm:w-7" />

            {(userName || userEmail) && (
              <div className="hidden md:block text-sm text-right">
                {userName && (
                  <div className="font-medium text-gray-900 dark:text-gray-100">{userName}</div>
                )}
                {userEmail && (
                  <div className="text-gray-500 dark:text-gray-400 text-xs">{userEmail}</div>
                )}
              </div>
            )}

            {/* Mobile: avatar initial */}
            {userName && (
              <div className="md:hidden flex items-center justify-center w-8 h-8 rounded-full bg-blue-600 text-white text-xs font-bold">
                {userName.charAt(0).toUpperCase()}
              </div>
            )}

            <button
              onClick={() => window.location.href = '/api/auth/federated-signout'}
              className="px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
            >
              <span className="hidden sm:inline">Sign Out</span>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 sm:hidden">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
