// Health check endpoint — returns system status for monitoring and readiness probes
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

type ServiceStatus = 'ok' | 'error' | 'unconfigured';

interface HealthResponse {
  status: 'ok' | 'degraded' | 'error';
  version: string;
  uptime: number;
  timestamp: string;
  environment: string;
  checks: {
    database: 'ok' | 'error';
    r2: ServiceStatus;
    qstash: ServiceStatus;
  };
}

function checkR2(): ServiceStatus {
  const hasConfig =
    process.env.R2_ACCOUNT_ID &&
    process.env.R2_ACCESS_KEY_ID &&
    process.env.R2_SECRET_ACCESS_KEY &&
    process.env.R2_BUCKET_NAME;
  return hasConfig ? 'ok' : 'unconfigured';
}

function checkQStash(): ServiceStatus {
  const hasConfig = process.env.QSTASH_TOKEN;
  return hasConfig ? 'ok' : 'unconfigured';
}

function deriveStatus(
  db: 'ok' | 'error',
  r2: ServiceStatus,
  qstash: ServiceStatus,
): 'ok' | 'degraded' | 'error' {
  if (db === 'error') return 'error';
  if (r2 === 'error' || qstash === 'error') return 'degraded';
  return 'ok';
}

export async function GET(): Promise<NextResponse<HealthResponse>> {
  let dbStatus: 'ok' | 'error' = 'ok';

  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch {
    dbStatus = 'error';
  }

  const r2Status = checkR2();
  const qstashStatus = checkQStash();
  const status = deriveStatus(dbStatus, r2Status, qstashStatus);

  const response: HealthResponse = {
    status,
    version: process.env.APP_VERSION ?? '0.0.0',
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV ?? 'unknown',
    checks: {
      database: dbStatus,
      r2: r2Status,
      qstash: qstashStatus,
    },
  };

  return NextResponse.json(response, {
    status: status === 'error' ? 503 : 200,
  });
}
