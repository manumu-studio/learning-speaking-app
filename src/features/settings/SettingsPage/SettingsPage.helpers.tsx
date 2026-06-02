// Shared primitive components and constants for the SettingsPage feature
'use client';

import type { SettingKey } from '@/features/settings/useSettings';

// ─── Section wrapper ─────────────────────────────────────────────────────────

export function SettingsSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 space-y-4">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">{title}</h2>
      {children}
    </section>
  );
}

// ─── Skeleton row for loading state ──────────────────────────────────────────

export function SkeletonRow() {
  return (
    <div className="flex items-center justify-between py-3">
      <div className="h-4 w-32 rounded bg-gray-200 dark:bg-gray-700 animate-pulse" />
      <div className="h-8 w-24 rounded bg-gray-200 dark:bg-gray-700 animate-pulse" />
    </div>
  );
}

// ─── Segmented control ───────────────────────────────────────────────────────

export interface SegmentedOption<T extends string | number> {
  label: string;
  value: T;
}

export function SegmentedControl<T extends string | number>({
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

export function Toggle({
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

export function SettingRow({
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

// ─── Shared option constants ──────────────────────────────────────────────────

export const DAILY_GOAL_OPTIONS = [5, 10, 15, 20, 30] as const;

export const DURATION_OPTIONS = [
  { label: '30s', value: 30 },
  { label: '1min', value: 60 },
  { label: '2min', value: 120 },
  { label: '5min', value: 300 },
] as const;

export const THEME_OPTIONS = [
  { label: 'Light', value: 'light' },
  { label: 'Dark', value: 'dark' },
  { label: 'System', value: 'system' },
] as const;

export const PHONEME_OPTIONS = [
  { label: 'IPA', value: 'IPA' },
  { label: 'SAPI', value: 'SAPI' },
] as const;
