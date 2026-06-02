// About section — version, privacy policy link, and AI processing disclosure
import { SettingsSection } from './SettingsPage.helpers';

export function SettingsAboutSection() {
  return (
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
  );
}
