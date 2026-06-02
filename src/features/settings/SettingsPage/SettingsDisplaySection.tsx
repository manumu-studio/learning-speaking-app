// Display settings section — theme and phoneme alphabet preferences
'use client';

import type { SettingKey, UserSettings } from '@/features/settings/useSettings';
import {
  SettingsSection,
  SkeletonRow,
  SettingRow,
  SegmentedControl,
  THEME_OPTIONS,
  PHONEME_OPTIONS,
} from './SettingsPage.helpers';

interface SettingsDisplaySectionProps {
  isBusy: boolean;
  settings: UserSettings | null;
  savedKey: SettingKey | null;
  onUpdate: <K extends SettingKey>(key: K, value: UserSettings[K]) => Promise<void>;
}

export function SettingsDisplaySection({
  isBusy,
  settings,
  savedKey,
  onUpdate,
}: SettingsDisplaySectionProps) {
  return (
    <SettingsSection title="Display">
      {isBusy || !settings ? (
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
              onChange={(val) => void onUpdate('theme', val)}
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
              onChange={(val) => void onUpdate('phonemeAlphabet', val)}
              disabled={false}
            />
          </SettingRow>
        </>
      )}
    </SettingsSection>
  );
}
