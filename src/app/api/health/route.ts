// Health check endpoint — returns system status for monitoring and readiness probes
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

interface HealthResponse {
  status: 'ok' | 'degraded';
  version: string;
  uptime: number;
  timestamp: string;
  environment: string;
  checks: {
    database: 'ok' | 'error';
  };
}

export async function GET(): Promise<NextResponse<HealthResponse>> {
  let dbStatus: 'ok' | 'error' = 'ok';

  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch {
    dbStatus = 'error';
  }

  const status = dbStatus === 'ok' ? 'ok' : 'degraded';

  const response: HealthResponse = {
    status,
    version: '0.46.0',
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV ?? 'unknown',
    checks: {
      database: dbStatus,
    },
  };

  return NextResponse.json(response, {
    status: status === 'ok' ? 200 : 503,
  });
}
