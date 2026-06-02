// Account settings section — sign out and delete account actions
'use client';

import { SettingsSection } from './SettingsPage.helpers';

export function SettingsAccountSection() {
  return (
    <SettingsSection title="Account">
      <div className="flex items-center justify-between py-3">
        <div>
          <span className="text-sm font-medium text-gray-900 dark:text-gray-100">Sign out</span>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            End your current session
          </p>
        </div>
        <button
          type="button"
          onClick={() => { window.location.href = '/api/auth/federated-signout'; }}
          className="px-4 py-1.5 text-sm font-medium text-red-600 dark:text-red-400 border border-red-300 dark:border-red-700 rounded-lg hover:bg-red-50 dark:hover:bg-red-950 transition-colors"
        >
          Sign Out
        </button>
      </div>

      <div className="flex items-center justify-between py-3 border-t border-gray-100 dark:border-gray-800">
        <div>
          <span className="text-sm font-medium text-gray-900 dark:text-gray-100">Delete account</span>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Permanently delete your data (coming soon)
          </p>
        </div>
        <button
          type="button"
          disabled
          className="px-4 py-1.5 text-sm font-medium text-gray-400 dark:text-gray-600 border border-gray-200 dark:border-gray-700 rounded-lg cursor-not-allowed opacity-50"
        >
          Delete
        </button>
      </div>
    </SettingsSection>
  );
}
