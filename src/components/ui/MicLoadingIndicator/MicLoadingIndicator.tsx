// Pulsing microphone loading indicator — used as page loading state for non-dashboard routes

export function MicLoadingIndicator() {
  return (
    <div className="fixed inset-0 flex items-center justify-center">
      <div className="animate-pulse">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-12 w-12 text-sky-400 dark:text-sky-500"
          aria-hidden="true"
        >
          <rect x="9" y="2" width="6" height="11" rx="3" />
          <path d="M5 10a7 7 0 0 0 14 0" />
          <line x1="12" y1="19" x2="12" y2="22" />
        </svg>
      </div>
    </div>
  );
}
