// Banner shown above the recorder when a prompt is pre-selected from the library
import type { PromptBannerProps } from './PromptBanner.types';

export function PromptBanner({ promptText, category, className = '' }: PromptBannerProps) {
  return (
    <div
      className={`rounded-xl border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-950/30 ${className}`}
    >
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xs font-medium text-blue-600 dark:text-blue-400">
          Your prompt
        </span>
        <span className="text-xs rounded-full bg-blue-100 px-2 py-0.5 font-medium text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
          {category}
        </span>
      </div>
      <p className="text-sm font-medium text-gray-900 dark:text-white leading-relaxed">
        {promptText}
      </p>
    </div>
  );
}
