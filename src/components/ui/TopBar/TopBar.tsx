// Top navigation bar with logo, app nav, theme toggle, and user menu
'use client';

import Image from 'next/image';
import Link from 'next/link';
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
            <MainNav className="hidden md:flex" />
          </div>

          {/* Right: theme toggle + user info + sign out */}
          <div className="flex items-center space-x-2 sm:space-x-4">
            <ThemeToggle className="h-6 w-6 sm:h-7 sm:w-7" />

            <Link
              href="/settings"
              aria-label="Settings"
              className="flex items-center justify-center rounded-full text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors p-1"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5 sm:h-6 sm:w-6" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
              </svg>
            </Link>

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
              type="button"
              aria-label="Sign out"
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
