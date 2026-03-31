// Drill exercise page — renders the drill recording and feedback UI
import { DrillView } from '@/features/training/DrillView';

interface DrillPageProps {
  params: Promise<{ id: string }>;
}

export default async function DrillPage({ params }: DrillPageProps) {
  const { id } = await params;
  return (
    <main className="min-h-screen bg-zinc-900 py-8">
      <DrillView drillId={id} />
    </main>
  );
}
