// Hook for fetching, caching, and updating user settings with optimistic UI
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useTheme } from 'next-themes';
import { loadSettings, patchSetting } from './settingsApi';

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

// ─── localStorage key for phoneme alphabet (shared with usePhonemeAlphabet) ──

const PHONEME_STORAGE_KEY = 'lsa-phoneme-alphabet';

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
        const parsed = await loadSettings();
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

      const previous = settings;
      setSettings({ ...settings, [key]: value });
      setError(null);

      if (key === 'theme') setTheme(String(value));
      if (key === 'phonemeAlphabet') {
        window.localStorage.setItem(PHONEME_STORAGE_KEY, String(value).toLowerCase());
      }

      try {
        const parsed = await patchSetting(key, value);
        if (mountedRef.current) setSettings(parsed);
      } catch (err) {
        if (mountedRef.current) {
          setSettings(previous);
          setError(err instanceof Error ? err.message : 'Failed to save setting');
        }
        if (key === 'theme') setTheme(String(previous.theme));
        if (key === 'phonemeAlphabet') {
          window.localStorage.setItem(PHONEME_STORAGE_KEY, previous.phonemeAlphabet.toLowerCase());
        }
      }
    },
    [settings, setTheme],
  );

  return { settings, isLoading, error, updateSetting };
}
