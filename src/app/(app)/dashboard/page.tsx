// Dashboard page — server component rendering DashboardView
import { DashboardView } from '@/features/dashboard/DashboardView';

export default function DashboardPage() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="text-2xl font-bold text-slate-800">Dashboard</h1>
      <p className="mt-1 text-sm text-slate-500">
        Track your speaking patterns and set training focus areas.
      </p>
      <div className="mt-6">
        <DashboardView />
      </div>
    </main>
  );
}
