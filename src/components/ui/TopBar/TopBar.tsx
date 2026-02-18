// Top navigation bar with app branding and user menu
'use client';

import { signOut } from 'next-auth/react';
import { MainNav } from '@/components/ui/MainNav';
import type { TopBarProps } from './TopBar.types';

export function TopBar({ userName, userEmail }: TopBarProps) {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Left: App branding + nav */}
          <div className="flex items-center space-x-8">
            <h1 className="text-xl font-semibold text-gray-900">
              Learning Speaking App
            </h1>
            <MainNav />
          </div>

          {/* Right: User info + sign out */}
          <div className="flex items-center space-x-4">
            {(userName || userEmail) && (
              <div className="text-sm text-right">
                {userName && (
                  <div className="font-medium text-gray-900">{userName}</div>
                )}
                {userEmail && (
                  <div className="text-gray-500">{userEmail}</div>
                )}
              </div>
            )}
            <button
              onClick={() => signOut({ callbackUrl: '/' })}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
