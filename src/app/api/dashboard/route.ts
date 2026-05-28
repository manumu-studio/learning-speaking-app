// Dashboard API — returns aggregated performance data for authenticated user
import { auth } from '@/features/auth/auth';
import { prisma } from '@/lib/prisma';
import { getDashboardData } from '@/features/dashboard/getDashboardData';
import { errorResponse, successResponse } from '@/lib/api';

const DASHBOARD_CACHE = {
  'Cache-Control': 'private, max-age=30, stale-while-revalidate=60',
} as const;

export async function GET() {
  const session = await auth();

  if (!session?.user?.externalId) {
    return errorResponse('Unauthorized', 'UNAUTHORIZED', 401);
  }

  const user = await prisma.user.findUnique({
    where: { externalId: session.user.externalId },
    select: { id: true },
  });

  if (!user) {
    return errorResponse('Unauthorized', 'UNAUTHORIZED', 401);
  }

  const data = await getDashboardData(user.id);
  return successResponse(data, 200, { ...DASHBOARD_CACHE });
}
