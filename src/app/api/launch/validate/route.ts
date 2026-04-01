// Launch QR token validation endpoint — verifies guest tokens from QR scanner
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { validateToken } from '@/config/launch-guests';

// Request body schema — Zod replaces the former ValidateRequest interface
const validateRequestSchema = z.object({
  token: z.string().min(1),
});

// Validate a QR token
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
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
  } catch {
    return NextResponse.json(
      { valid: false, error: 'Invalid request' },
      { status: 400 }
    );
  }
}
