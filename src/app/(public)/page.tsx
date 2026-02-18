// Landing page for unauthenticated users
export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-linear-to-b from-blue-50 to-white">
      <div className="container flex max-w-2xl flex-col items-center gap-8 px-4 text-center">
        <h1 className="text-5xl font-bold tracking-tight text-gray-900">
          Learning Speaking App
        </h1>
        <p className="text-xl text-gray-600">
          Practice speaking, get instant AI feedback, and track your progress over time.
        </p>
        <button
          className="rounded-lg bg-blue-600 px-8 py-3 text-lg font-semibold text-white transition hover:bg-blue-700"
          disabled
        >
          Sign in to start
        </button>
        <p className="text-sm text-gray-500">
          Authentication will be enabled in the next phase
        </p>
      </div>
    </div>
  );
}
