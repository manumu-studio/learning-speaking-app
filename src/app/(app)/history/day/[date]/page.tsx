// Day detail page — aggregated view of a day's speaking sessions
import { use, Suspense } from 'react';
import { DayDetailContent, DayDetailSkeleton } from '@/features/history/DayDetailContent';

function DayDetailPageContent({ params }: { params: Promise<{ date: string }> }) {
  const { date } = use(params);
  return <DayDetailContent date={date} />;
}

export default function DayDetailPage({
  params,
}: {
  params: Promise<{ date: string }>;
}) {
  return (
    <Suspense fallback={<DayDetailSkeleton />}>
      <DayDetailPageContent params={params} />
    </Suspense>
  );
}
