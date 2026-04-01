// CSRF origin check — validates Origin/Referer header against APP_URL
import { env } from '@/lib/env';

/**
 * Validates that the request origin matches the app URL.
 * Returns true if the request is safe, false if it should be rejected.
 *
 * Exempt: requests with valid QStash signatures (checked separately in webhook routes).
 */
export function validateOrigin(request: Request): boolean {
  const origin = request.headers.get('origin');
  const referer = request.headers.get('referer');

  const requestOrigin = origin ?? (referer ? new URL(referer).origin : null);

  if (!requestOrigin) {
    return true;
  }

  const appOrigin = new URL(env.APP_URL).origin;
  return requestOrigin === appOrigin;
}

/** Standard 403 response for CSRF failures */
export function csrfForbiddenResponse(): Response {
  return Response.json(
    { error: 'Forbidden — origin mismatch', code: 'CSRF_REJECTED' },
    { status: 403 }
  );
}
