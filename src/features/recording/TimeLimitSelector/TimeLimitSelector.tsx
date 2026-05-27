// Segmented control for selecting a recording time limit
'use client';

import { useEffect } from 'react';
import { z } from 'zod';
import type { TimeLimitOption, TimeLimitSelectorProps } from './TimeLimitSelector.types';

const STORAGE_KEY = 'lsa-time-limit';

const storedLimitSchema = z.union([
  z.literal(60),
  z.literal(120),
  z.literal(300),
  z.null(),
]);

const OPTIONS: ReadonlyArray<{ value: TimeLimitOption; label: string }> = [
  { value: 60, label: '1 min' },
  { value: 120, label: '2 min' },
  { value: 300, label: '5 min' },
  { value: null, label: 'Free' },
];

function readStoredLimit(): TimeLimitOption | undefined {
  if (typeof window === 'undefined') return undefined;
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw === null) return undefined;
  if (raw === 'null') {
    const parsed = storedLimitSchema.safeParse(null);
    return parsed.success ? parsed.data : undefined;
  }
  const numeric = Number(raw);
  if (!Number.isFinite(numeric)) return undefined;
  const parsed = storedLimitSchema.safeParse(numeric);
  return parsed.success ? parsed.data : undefined;
}

function writeStoredLimit(limit: TimeLimitOption): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, limit === null ? 'null' : String(limit));
}

export function TimeLimitSelector({
  selected,
  onChange,
  disabled = false,
}: TimeLimitSelectorProps) {
  useEffect(() => {
    const stored = readStoredLimit();
    if (stored !== undefined) {
      onChange(stored);
    }
    // Restore persisted limit once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSelect = (limit: TimeLimitOption) => {
    if (disabled) return;
    writeStoredLimit(limit);
    onChange(limit);
  };

  return (
    <div
      role="group"
      aria-label="Recording time limit"
      className={`inline-flex rounded-full border border-gray-200 bg-gray-50 p-1 dark:border-gray-700 dark:bg-gray-800 ${
        disabled ? 'pointer-events-none opacity-50' : ''
      }`}
    >
      {OPTIONS.map(({ value, label }) => {
        const isSelected = selected === value;
        return (
          <button
            key={label}
            type="button"
            aria-pressed={isSelected}
            disabled={disabled}
            onClick={() => handleSelect(value)}
            className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
              isSelected
                ? 'bg-white text-blue-700 shadow-sm dark:bg-gray-900 dark:text-blue-300'
                : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200'
            }`}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
