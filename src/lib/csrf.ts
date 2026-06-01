// CSRF origin check — validates Origin/Referer header against APP_URL
import { env } from '@/lib/env';

/**
 * Validates that the request `Origin` (or `Referer`) matches the configured `APP_URL`.
 *
 * Requests without an `Origin` or `Referer` header are allowed through (server-to-server calls).
 * QStash webhook routes check signatures separately and should not use this guard.
 *
 * @param request - The incoming HTTP request.
 * @returns `true` if the origin matches `APP_URL` or is absent; `false` if it mismatches.
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

/**
 * Returns a standard 403 JSON response for CSRF origin mismatch failures.
 *
 * @returns A `Response` with status 403 and JSON body `{ error, code: 'CSRF_REJECTED' }`.
 */
export function csrfForbiddenResponse(): Response {
  return Response.json(
    { error: 'Forbidden — origin mismatch', code: 'CSRF_REJECTED' },
    { status: 403 }
  );
}
