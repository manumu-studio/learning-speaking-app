// Launch QR token validation endpoint — verifies guest tokens from QR scanner
import { NextRequest, NextResponse } from 'next/server';
import { validateToken } from '@/config/launch-guests';

// Request body schema
interface ValidateRequest {
  token: string;
}

// Validate a QR token
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = (await request.json()) as ValidateRequest;

    if (!body.token || typeof body.token !== 'string') {
      return NextResponse.json(
        { valid: false, error: 'Token is required' },
        { status: 400 }
      );
    }

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
