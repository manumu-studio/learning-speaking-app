// Dashboard API — returns aggregated performance data for authenticated user
import { NextResponse } from 'next/server';
import { auth } from '@/features/auth/auth';
import { prisma } from '@/lib/prisma';
import { getDashboardData } from '@/features/dashboard/getDashboardData';

export async function GET() {
  const session = await auth();

  if (!session?.user?.externalId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { externalId: session.user.externalId },
    select: { id: true },
  });

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const data = await getDashboardData(user.id);
  return NextResponse.json(data);
}
