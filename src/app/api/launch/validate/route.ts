// Launch QR token validation endpoint — verifies guest tokens from QR scanner
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { validateToken } from '@/config/launch-guests';
import { withObservability } from '@/lib/observability';

// Request body schema — Zod replaces the former ValidateRequest interface
const validateRequestSchema = z.object({
  token: z.string().min(1),
});

// Validate a QR token
async function handler(request: Request): Promise<Response> {
  const parsed = validateRequestSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json(
      { valid: false, error: 'Token is required' },
      { status: 400 }
    );
  }

  const body = parsed.data;

  const guest = validateToken(body.token.trim());

  if (!guest) {
    return NextResponse.json(
      { valid: false, error: 'Invalid invitation' },
      { status: 401 }
    );
  }

  return NextResponse.json({
    valid: true,
    guestName: guest.name,
    guestSlug: guest.slug,
  });
}

export const POST = withObservability(handler, { route: 'launch/validate' });
