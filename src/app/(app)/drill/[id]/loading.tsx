// Loading skeleton for drill exercise page — shown during route transition
export default function DrillLoading() {
  return (
    <div className="min-h-screen bg-zinc-900 py-8">
      <div className="mx-auto max-w-3xl px-4">
        <div className="mb-6 h-8 w-48 animate-pulse rounded bg-zinc-800" />
        <div className="mb-4 h-32 animate-pulse rounded-xl bg-zinc-800" />
        <div className="h-64 animate-pulse rounded-xl bg-zinc-800" />
      </div>
    </div>
  );
}
