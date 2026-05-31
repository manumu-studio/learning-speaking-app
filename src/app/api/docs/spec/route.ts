// Serves the OpenAPI spec as JSON for Swagger UI (development only)
import { readFileSync } from 'fs';
import { join } from 'path';
import { NextResponse } from 'next/server';
import yaml from 'js-yaml';
import { withObservability } from '@/lib/observability';

async function handler() {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 404 });
  }

  const specPath = join(process.cwd(), 'docs/api/openapi.yaml');
  const raw = readFileSync(specPath, 'utf8');
  const parsed: unknown = yaml.load(raw);

  if (parsed === null || typeof parsed !== 'object') {
    return NextResponse.json({ error: 'Invalid OpenAPI document' }, { status: 500 });
  }

  return NextResponse.json(parsed as Record<string, unknown>);
}

export const GET = withObservability(handler, { route: 'docs/spec' });
