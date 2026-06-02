// Settings page UI — manages user preferences with optimistic auto-save
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSettings } from '@/features/settings/useSettings';
import type { SettingsPageProps } from './SettingsPage.types';
import type { SettingKey, UserSettings } from '@/features/settings/useSettings';
import { SettingsTrainingSection } from './SettingsTrainingSection';
import { SettingsDisplaySection } from './SettingsDisplaySection';
import { SettingsAiDataSection } from './SettingsAiDataSection';
import { SettingsAccountSection } from './SettingsAccountSection';
import { SettingsAboutSection } from './SettingsAboutSection';

// ─── Profile card ─────────────────────────────────────────────────────────────

function ProfileCard({ userName, userEmail }: { userName: string | null; userEmail: string | null }) {
  return (
    <section className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 space-y-4">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Profile</h2>
      <div className="flex items-center gap-4 py-2">
        <div className="flex items-center justify-center w-12 h-12 rounded-full bg-blue-600 text-white text-lg font-bold shrink-0">
          {userName ? userName.charAt(0).toUpperCase() : '?'}
        </div>
        <div className="min-w-0">
          {userName && (
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{userName}</p>
          )}
          {userEmail && (
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{userEmail}</p>
          )}
        </div>
      </div>
    </section>
  );
}

// ─── Main component ─────────────────────────────────────────────────────────

export function SettingsPage({ userName, userEmail }: SettingsPageProps) {
  const { settings, isLoading, error, updateSetting } = useSettings();
  const [savedKey, setSavedKey] = useState<SettingKey | null>(null);

  // Clear "Saved" indicator after 1500ms
  useEffect(() => {
    if (!savedKey) return;
    const timer = setTimeout(() => setSavedKey(null), 1500);
    return () => clearTimeout(timer);
  }, [savedKey]);

  const handleUpdate = useCallback(
    async <K extends SettingKey>(key: K, value: UserSettings[K]): Promise<void> => {
      await updateSetting(key, value);
      setSavedKey(key);
    },
    [updateSetting],
  );

  const isBusy = isLoading || !settings;

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Settings</h1>

      {error && (
        <div className="rounded-lg border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950 p-3 text-sm text-red-700 dark:text-red-300">
          {error}
        </div>
      )}

      <ProfileCard userName={userName} userEmail={userEmail} />

      <SettingsTrainingSection
        isBusy={isBusy}
        settings={settings ?? null}
        savedKey={savedKey}
        onUpdate={handleUpdate}
      />

      <SettingsDisplaySection
        isBusy={isBusy}
        settings={settings ?? null}
        savedKey={savedKey}
        onUpdate={handleUpdate}
      />

      <SettingsAiDataSection />

      <SettingsAccountSection />

      <SettingsAboutSection />
    </div>
  );
}
