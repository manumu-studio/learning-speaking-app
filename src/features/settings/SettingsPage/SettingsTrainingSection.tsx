// Training settings section — daily goal, default duration, pronunciation toggle
'use client';

import type { SettingKey, UserSettings } from '@/features/settings/useSettings';
import {
  SettingsSection,
  SkeletonRow,
  SettingRow,
  SegmentedControl,
  Toggle,
  DAILY_GOAL_OPTIONS,
  DURATION_OPTIONS,
} from './SettingsPage.helpers';

interface SettingsTrainingSectionProps {
  isBusy: boolean;
  settings: UserSettings | null;
  savedKey: SettingKey | null;
  onUpdate: <K extends SettingKey>(key: K, value: UserSettings[K]) => Promise<void>;
}

export function SettingsTrainingSection({
  isBusy,
  settings,
  savedKey,
  onUpdate,
}: SettingsTrainingSectionProps) {
  return (
    <SettingsSection title="Training">
      {isBusy || !settings ? (
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
              onChange={(e) => void onUpdate('dailyGoalMinutes', Number(e.target.value))}
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
              onChange={(val) => void onUpdate('defaultDurationSecs', val)}
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
              onChange={(val) => void onUpdate('pronunciationEnabled', val)}
              disabled={false}
              label="Toggle pronunciation analysis"
            />
          </SettingRow>
        </>
      )}
    </SettingsSection>
  );
}
