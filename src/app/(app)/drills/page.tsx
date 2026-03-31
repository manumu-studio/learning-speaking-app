// Training history page — shows drill stats and drill attempt history
import { DrillHistoryView } from '@/features/training/DrillHistoryView';

export default function DrillsPage() {
  return (
    <main className="min-h-screen bg-zinc-900 py-8">
      <DrillHistoryView />
    </main>
  );
}
