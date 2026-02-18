# PR-0.2.0 — Database Schema

**Branch:** `feature/database-schema` → `main`
**Version:** `0.2.0`
**Date:** 2026-02-18

---

## What Changed

- Replaced empty Prisma schema shell with full 6-model schema (User, UserConsent, SpeakingSession, Transcript, Insight, PatternProfile)
- Created `session.types.ts` with union types, composite relation types, and input types for all DB operations
- Created `db-utils.ts` with three utility functions for common access patterns
- Added no-op seed scaffold ready for future development data
- Updated `package.json` to v0.2.0 with prisma seed config and db convenience scripts
- Created `.env` (gitignored) — Prisma CLI reads `.env`, not `.env.local`

---

## Files

| File | Action | Notes |
|---|---|---|
| `prisma/schema.prisma` | Modified | Full 6-model schema with enums, indexes, cascade deletes |
| `src/features/session/session.types.ts` | Created | Union types + composite types + input types |
| `prisma/seed.ts` | Created | No-op MVP scaffold — ready for dev data |
| `src/lib/db-utils.ts` | Created | findOrCreateUser, getUserSessions, hasConsent |
| `package.json` | Modified | Bumped to 0.2.0, added prisma seed config, db:seed/push/studio |
| `.gitignore` | Modified | Added `.env` to ignored files |
| `.env` | Created | `DATABASE_URL` for Prisma CLI — gitignored, not committed |

---

## Decisions

| Decision | Why |
|---|---|
| Union types over Prisma enum imports | Decouples business logic from ORM — union types are portable to tests and edge functions |
| `prisma db push` for MVP | Avoids migration overhead while schema is unstable — `migrate dev` pre-launch |
| `PatternProfile` optional 1:1 | Lazy creation on first AI analysis — no row needed at signup |
| `audioDeletedAt` soft-delete | Preserves audit trail after R2 object deletion |
| Removed unused Prisma enum aliases | `noUnusedLocals: true` enforcement — packet imported them but never used them |
| `.env` alongside `.env.local` | Prisma CLI reads `.env` — Next.js reads `.env.local` — two consumers, same URL |

---

## Validation

```bash
npx prisma generate   # ✅ Prisma Client v6.19.2 generated
npx prisma db push    # ✅ all 6 tables created in Neon
npx tsc --noEmit      # ✅ zero errors
npm run build         # ✅ clean — 4 static pages
npm run lint          # ✅ no warnings or errors
```

---

## Notes

- `DATABASE_URL` must be present in `.env` before running any Prisma CLI command
- `npx prisma generate` must run in CI/CD before `npm run build` (generates `@prisma/client`)
- Tables viewable via `npm run db:studio` after push
