# Security Policy — Learning Speaking App

## Core Principles

1. **Privacy-first**: audio is never stored permanently by default
2. **Explicit consent**: recording only starts when user presses Start
3. **Data minimization**: only store structured insights, not raw data
4. **User control**: full delete + export capabilities (GDPR)

## Audio Handling

- Audio recorded only during active session (user-initiated)
- Uploaded over TLS (HTTPS) to temporary storage (R2)
- **Deleted immediately** after transcription completes
- `audioDeletedAt` timestamp recorded for audit trail
- No audio stored unless user explicitly opts in (future)

## Transcript Handling

- Transcripts are **PII** — contain user's spoken words
- All DB queries scoped to `userId` — no cross-user access
- Never logged, never included in error reports
- Deletable via GDPR delete endpoint
- Exportable via GDPR export endpoint

## Authentication

- OIDC Authorization Code + PKCE (S256) via auth.manumustudio.com
- RS256 JWT tokens validated against JWKS endpoint
- Client secret stored only in server-side environment variables
- Session strategy: JWT (no server-side session storage needed)
- No refresh tokens in MVP — re-authenticate on expiry

## API Security

- All user-facing API routes require valid session
- Internal webhook (`/api/internal/process`) validates QStash signature
- Rate limiting on session creation (prevent abuse)
- File upload validation: size ≤50MB, audio MIME type verification
- Structured error responses — never leak stack traces

## Data Retention

| Data | Retention | Deletable |
|------|-----------|-----------|
| Audio | Deleted after transcription (~minutes) | N/A |
| Transcript | Until user deletes | Yes (cascade) |
| Insights | Until user deletes | Yes (cascade) |
| Pattern profile | Until user deletes/resets | Yes |
| Session metadata | Until user deletes | Yes (cascade) |

## GDPR Compliance

- `DELETE /api/sessions/:id` — deletes session + transcript + insights
- `DELETE /api/profile` — deletes ALL user data (cascade)
- `GET /api/profile/export` — exports all user data as JSON
- `UserConsent` model tracks granular consent with timestamps
- Consent revocation supported (sets `revokedAt`)

## What We Don't Do

- No background listening
- No teacher access to individual sessions
- No audio surveillance
- No cross-user data sharing
- No transcript logging in application logs
- No third-party analytics on transcript content

## Reporting Vulnerabilities

If you discover a security issue, contact: security@manumustudio.com
