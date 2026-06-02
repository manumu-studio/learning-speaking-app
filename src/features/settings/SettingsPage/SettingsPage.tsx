// Settings page UI — manages user preferences with optimistic auto-save
'use client';
/* eslint-disable max-lines-per-function */

import { useState, useEffect, useCallback } from 'react';
import { useSettings } from '@/features/settings/useSettings';
import type { SettingsPageProps } from './SettingsPage.types';
import type { SettingKey, UserSettings } from '@/features/settings/useSettings';
import { AiDisclosureModal } from '@/components/ui/AiDisclosureModal';

// ─── Section wrapper ─────────────────────────────────────────────────────────

function SettingsSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 space-y-4">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">{title}</h2>
      {children}
    </section>
  );
}

// ─── Skeleton row for loading state ──────────────────────────────────────────

function SkeletonRow() {
  return (
    <div className="flex items-center justify-between py-3">
      <div className="h-4 w-32 rounded bg-gray-200 dark:bg-gray-700 animate-pulse" />
      <div className="h-8 w-24 rounded bg-gray-200 dark:bg-gray-700 animate-pulse" />
    </div>
  );
}

// ─── Segmented control ───────────────────────────────────────────────────────

interface SegmentedOption<T extends string | number> {
  label: string;
  value: T;
}

function SegmentedControl<T extends string | number>({
  options,
  selected,
  onChange,
  disabled,
}: {
  options: ReadonlyArray<SegmentedOption<T>>;
  selected: T;
  onChange: (value: T) => void;
  disabled: boolean;
}) {
  return (
    <div className="flex rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
      {options.map((opt) => (
        <button
          key={String(opt.value)}
          type="button"
          disabled={disabled}
          onClick={() => onChange(opt.value)}
          className={`px-3 py-1.5 text-sm font-medium transition-colors ${
            selected === opt.value
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
          } disabled:opacity-50`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

// ─── Toggle switch ───────────────────────────────────────────────────────────

function Toggle({
  checked,
  onChange,
  disabled,
  label,
}: {
  checked: boolean;
  onChange: (val: boolean) => void;
  disabled: boolean;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-black disabled:opacity-50 ${
        checked ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'
      }`}
    >
      <span
        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition-transform ${
          checked ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  );
}

// ─── Setting row ─────────────────────────────────────────────────────────────

function SettingRow({
  label,
  description,
  children,
  savedKey,
  currentSavedKey,
}: {
  label: string;
  description?: string;
  children: React.ReactNode;
  savedKey: SettingKey;
  currentSavedKey: SettingKey | null;
}) {
  return (
    <div className="flex items-center justify-between py-3 border-t border-gray-100 dark:border-gray-800 first:border-t-0">
      <div className="flex-1 min-w-0 pr-4">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{label}</span>
          {currentSavedKey === savedKey && (
            <span className="text-xs text-green-600 dark:text-green-400 font-medium">Saved</span>
          )}
        </div>
        {description && (
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{description}</p>
        )}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

// ─── Daily goal options ──────────────────────────────────────────────────────

const DAILY_GOAL_OPTIONS = [5, 10, 15, 20, 30] as const;

const DURATION_OPTIONS = [
  { label: '30s', value: 30 },
  { label: '1min', value: 60 },
  { label: '2min', value: 120 },
  { label: '5min', value: 300 },
] as const;

const THEME_OPTIONS = [
  { label: 'Light', value: 'light' },
  { label: 'Dark', value: 'dark' },
  { label: 'System', value: 'system' },
] as const;

const PHONEME_OPTIONS = [
  { label: 'IPA', value: 'IPA' },
  { label: 'SAPI', value: 'SAPI' },
] as const;

// ─── Main component ─────────────────────────────────────────────────────────

export function SettingsPage({ userName, userEmail }: SettingsPageProps) {
  const { settings, isLoading, error, updateSetting } = useSettings();
  const [savedKey, setSavedKey] = useState<SettingKey | null>(null);
  const [showAiDisclosure, setShowAiDisclosure] = useState(false);

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

      {/* ── Profile ── */}
      <SettingsSection title="Profile">
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
      </SettingsSection>

      {/* ── Training ── */}
      <SettingsSection title="Training">
        {isBusy ? (
          <>
            <SkeletonRow />
            <SkeletonRow />
            <SkeletonRow />
          </>
        ) : (
          <>
            <SettingRow
              label="Daily goal"
              description="Minutes of speaking practice per day"
              savedKey="dailyGoalMinutes"
              currentSavedKey={savedKey}
            >
              <select
                value={settings.dailyGoalMinutes}
                onChange={(e) => void handleUpdate('dailyGoalMinutes', Number(e.target.value))}
                className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-1.5 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {DAILY_GOAL_OPTIONS.map((min) => (
                  <option key={min} value={min}>
                    {min} min
                  </option>
                ))}
              </select>
            </SettingRow>

            <SettingRow
              label="Default duration"
              description="Default recording length for new sessions"
              savedKey="defaultDurationSecs"
              currentSavedKey={savedKey}
            >
              <SegmentedControl
                options={DURATION_OPTIONS}
                selected={settings.defaultDurationSecs}
                onChange={(val) => void handleUpdate('defaultDurationSecs', val)}
                disabled={false}
              />
            </SettingRow>

            <SettingRow
              label="Pronunciation analysis"
              description="Enable Azure pronunciation scoring"
              savedKey="pronunciationEnabled"
              currentSavedKey={savedKey}
            >
              <Toggle
                checked={settings.pronunciationEnabled}
                onChange={(val) => void handleUpdate('pronunciationEnabled', val)}
                disabled={false}
                label="Toggle pronunciation analysis"
              />
            </SettingRow>
          </>
        )}
      </SettingsSection>

      {/* ── Display ── */}
      <SettingsSection title="Display">
        {isBusy ? (
          <>
            <SkeletonRow />
            <SkeletonRow />
          </>
        ) : (
          <>
            <SettingRow
              label="Theme"
              description="Choose your preferred color scheme"
              savedKey="theme"
              currentSavedKey={savedKey}
            >
              <SegmentedControl
                options={THEME_OPTIONS}
                selected={settings.theme}
                onChange={(val) => void handleUpdate('theme', val)}
                disabled={false}
              />
            </SettingRow>

            <SettingRow
              label="Phoneme alphabet"
              description="Display phonemes in IPA or Microsoft SAPI format"
              savedKey="phonemeAlphabet"
              currentSavedKey={savedKey}
            >
              <SegmentedControl
                options={PHONEME_OPTIONS}
                selected={settings.phonemeAlphabet}
                onChange={(val) => void handleUpdate('phonemeAlphabet', val)}
                disabled={false}
              />
            </SettingRow>
          </>
        )}
      </SettingsSection>

      {/* ── AI & Data ── */}
      <section
        aria-labelledby="ai-data-heading"
        className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 space-y-4"
      >
        <h2
          id="ai-data-heading"
          className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400"
        >
          AI & Data
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Your speech is analyzed by three AI services. No data is used for model training.
        </p>
        <button
          type="button"
          onClick={() => setShowAiDisclosure(true)}
          className="text-sm text-blue-600 dark:text-blue-400 hover:underline focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
        >
          View AI provider disclosure →
        </button>
        {showAiDisclosure && (
          <AiDisclosureModal infoOnly onAccept={() => setShowAiDisclosure(false)} />
        )}
      </section>

      {/* ── Account ── */}
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

      {/* ── About ── */}
      <SettingsSection title="About">
        <div className="space-y-3 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-gray-500 dark:text-gray-400">Version</span>
            <span className="font-mono text-gray-900 dark:text-gray-100">0.41.0</span>
          </div>

          <div className="flex items-center justify-between border-t border-gray-100 dark:border-gray-800 pt-3">
            <span className="text-gray-500 dark:text-gray-400">Privacy</span>
            <a
              href="/privacy"
              className="text-blue-600 dark:text-blue-400 hover:underline"
            >
              Privacy Policy
            </a>
          </div>

          <div className="border-t border-gray-100 dark:border-gray-800 pt-3">
            <p className="text-xs text-gray-400 dark:text-gray-500 leading-relaxed">
              Audio recordings are processed by OpenAI Whisper for transcription and Microsoft Azure
              for pronunciation scoring. Session analysis is powered by Anthropic Claude. Audio files
              are automatically deleted after processing.
            </p>
          </div>
        </div>
      </SettingsSection>
    </div>
  );
}
