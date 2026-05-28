// Hook for fetching, caching, and updating user settings with optimistic UI
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useTheme } from 'next-themes';
import { z } from 'zod';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface UserSettings {
  id: string;
  userId: string;
  dailyGoalMinutes: number;
  defaultDurationSecs: number;
  pronunciationEnabled: boolean;
  theme: 'light' | 'dark' | 'system';
  phonemeAlphabet: 'IPA' | 'SAPI';
  createdAt: string;
  updatedAt: string;
}

export type SettingKey = keyof Omit<UserSettings, 'id' | 'userId' | 'createdAt' | 'updatedAt'>;

export interface UseSettingsReturn {
  settings: UserSettings | null;
  isLoading: boolean;
  error: string | null;
  updateSetting: <K extends SettingKey>(key: K, value: UserSettings[K]) => Promise<void>;
}

// ─── Zod Schema ──────────────────────────────────────────────────────────────

const UserSettingsSchema = z.object({
  id: z.string(),
  userId: z.string(),
  dailyGoalMinutes: z.number().int(),
  defaultDurationSecs: z.number().int(),
  pronunciationEnabled: z.boolean(),
  theme: z.enum(['light', 'dark', 'system']),
  phonemeAlphabet: z.enum(['IPA', 'SAPI']),
  createdAt: z.string(),
  updatedAt: z.string(),
});

// ─── localStorage key for phoneme alphabet (shared with usePhonemeAlphabet) ──

const PHONEME_STORAGE_KEY = 'lsa-phoneme-alphabet';

// Schema for parsing API error responses
const ApiErrorSchema = z.object({ error: z.string() });

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useSettings(): UseSettingsReturn {
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { setTheme } = useTheme();
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Fetch settings on mount
  useEffect(() => {
    async function fetchSettings(): Promise<void> {
      try {
        const res = await fetch('/api/settings');
        if (!res.ok) {
          const body: unknown = await res.json().catch(() => ({}));
          const errorParsed = ApiErrorSchema.safeParse(body);
          throw new Error(errorParsed.success ? errorParsed.data.error : 'Failed to load settings');
        }
        const raw: unknown = await res.json();
        const parsed = UserSettingsSchema.parse(raw);
        if (mountedRef.current) {
          setSettings(parsed);
          setError(null);
        }
      } catch (err) {
        if (mountedRef.current) {
          setError(err instanceof Error ? err.message : 'Failed to load settings');
        }
      } finally {
        if (mountedRef.current) {
          setIsLoading(false);
        }
      }
    }

    void fetchSettings();
  }, []);

  const updateSetting = useCallback(
    async <K extends SettingKey>(key: K, value: UserSettings[K]): Promise<void> => {
      if (!settings) return;

      // Capture previous state for rollback
      const previous = settings;

      // Optimistic update
      const optimistic: UserSettings = { ...settings, [key]: value };
      setSettings(optimistic);
      setError(null);

      // Apply side effects immediately for responsive UX
      if (key === 'theme') {
        setTheme(String(value));
      }
      if (key === 'phonemeAlphabet') {
        window.localStorage.setItem(PHONEME_STORAGE_KEY, String(value).toLowerCase());
      }

      try {
        const res = await fetch('/api/settings', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ [key]: value }),
        });

        if (!res.ok) {
          const body: unknown = await res.json().catch(() => ({}));
          const errorParsed = ApiErrorSchema.safeParse(body);
          throw new Error(errorParsed.success ? errorParsed.data.error : 'Failed to save setting');
        }

        const raw: unknown = await res.json();
        const parsed = UserSettingsSchema.parse(raw);
        if (mountedRef.current) {
          setSettings(parsed);
        }
      } catch (err) {
        // Rollback on failure
        if (mountedRef.current) {
          setSettings(previous);
          setError(err instanceof Error ? err.message : 'Failed to save setting');
        }

        // Rollback side effects
        if (key === 'theme') {
          setTheme(String(previous.theme));
        }
        if (key === 'phonemeAlphabet') {
          window.localStorage.setItem(PHONEME_STORAGE_KEY, previous.phonemeAlphabet.toLowerCase());
        }
      }
    },
    [settings, setTheme],
  );

  return { settings, isLoading, error, updateSetting };
}
