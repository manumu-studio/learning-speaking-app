// API helpers for fetching and patching user settings — used by useSettings
import { z } from 'zod';
import type { UserSettings, SettingKey } from './useSettings';

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

const ApiErrorSchema = z.object({ error: z.string() });

function parseApiError(body: unknown, fallback: string): string {
  const parsed = ApiErrorSchema.safeParse(body);
  return parsed.success ? parsed.data.error : fallback;
}

/** Fetches user settings from GET /api/settings. */
export async function loadSettings(): Promise<UserSettings> {
  const res = await fetch('/api/settings');
  if (!res.ok) {
    const body: unknown = await res.json().catch(() => ({}));
    throw new Error(parseApiError(body, 'Failed to load settings'));
  }
  const raw: unknown = await res.json();
  return UserSettingsSchema.parse(raw);
}

/** Patches a single setting key via PATCH /api/settings. Returns the full updated settings. */
export async function patchSetting<K extends SettingKey>(
  key: K,
  value: UserSettings[K],
): Promise<UserSettings> {
  const res = await fetch('/api/settings', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ [key]: value }),
  });

  if (!res.ok) {
    const body: unknown = await res.json().catch(() => ({}));
    throw new Error(parseApiError(body, 'Failed to save setting'));
  }

  const raw: unknown = await res.json();
  return UserSettingsSchema.parse(raw);
}
