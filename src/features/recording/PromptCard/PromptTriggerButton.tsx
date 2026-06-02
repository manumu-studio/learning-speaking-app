// Pill-shaped trigger button that opens/closes the prompt category dropdown
'use client';

interface PromptTriggerButtonProps {
  isOpen: boolean;
  currentLabel: string;
  promptText: string;
  onToggle: () => void;
}

export function PromptTriggerButton({
  isOpen,
  currentLabel,
  promptText,
  onToggle,
}: PromptTriggerButtonProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={isOpen}
      aria-haspopup="listbox"
      aria-label="Select prompt category"
      className="flex w-full items-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-3 py-2 text-left text-sm transition-colors hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-800/60 dark:hover:bg-gray-800"
    >
      <span className="shrink-0 rounded-md bg-gray-200 px-2 py-0.5 text-xs font-semibold text-gray-700 dark:bg-gray-700 dark:text-gray-300">
        {currentLabel}
      </span>
      <span className="min-w-0 flex-1 truncate text-gray-500 dark:text-gray-400">
        {promptText}
      </span>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 20 20"
        fill="currentColor"
        className={`h-4 w-4 shrink-0 text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
      >
        <path
          fillRule="evenodd"
          d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z"
          clipRule="evenodd"
        />
      </svg>
    </button>
  );
}
