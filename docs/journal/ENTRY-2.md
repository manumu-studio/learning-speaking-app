# ENTRY-2 — Database Schema

**Date:** 2026-02-18
**Type:** Database
**Branch:** `feature/database-schema`
**Version:** `0.2.0`

---

## What I Did

Replaced the empty Prisma schema shell with the full 6-model schema: User, UserConsent, SpeakingSession, Transcript, Insight, PatternProfile. Added a TypeScript type layer in `session.types.ts`, three utility functions in `db-utils.ts`, and a no-op seed scaffold. Ran `prisma generate` and `prisma db push` to create all tables in Neon.

---

## Files Touched

| File | Action | Notes |
|---|---|---|
| `prisma/schema.prisma` | Modified | Full 6-model schema with enums, indexes, cascade deletes |
| `src/features/session/session.types.ts` | Created | Union types + composite types + input types |
| `prisma/seed.ts` | Created | No-op scaffold |
| `src/lib/db-utils.ts` | Created | findOrCreateUser, getUserSessions, hasConsent |
| `package.json` | Modified | Bumped to 0.2.0, prisma seed config, db scripts |
| `.gitignore` | Modified | Added `.env` to ignored list |
| `.env` | Created | DATABASE_URL for Prisma CLI — gitignored |

---

## What Went Differently

### Unused Prisma enum aliases triggered a compile error

The packet spec imported `SessionStatus as PrismaSessionStatus` and `ConsentFlag as PrismaConsentFlag` from `@prisma/client` but never referenced them. With `noUnusedLocals: true` in `tsconfig.json`, TypeScript throws TS6196 on both. Removed the aliases — the union types defined below in the same file are the intended export. Public API unchanged.

### Prisma CLI doesn't read `.env.local`

Running `npx prisma db push` failed with `Environment variable not found: DATABASE_URL` even though `.env.local` has it. Prisma CLI only reads `.env` — `.env.local` is a Next.js runtime convention that the CLI doesn't know about. Created a `.env` file with just `DATABASE_URL`, added `.env` to `.gitignore`. Both files carry the same Neon URL, serving different consumers.

---

## Decisions

**`cuid()` for all IDs** — collision-resistant, URL-safe, lexicographically sortable. Better than `uuid()` for a distributed system.

**`onDelete: Cascade` on all FK relations** — prevents orphaned rows without requiring application-level cleanup logic.

**Union types over Prisma enums in application code** — Prisma enums are database-level constructs. Importing them directly into business logic creates tight coupling. Union types are portable, testable, don't require Prisma to be importable.

**`prisma db push` for MVP** — avoids migration overhead while the schema is still evolving. Switch to `migrate dev` before launch.

**`PatternProfile` as optional 1:1** — no profile row on signup. Created lazily on first AI analysis result.

---

## Still Open

- No `.nvmrc` — Node 20 required but still not enforced. Carried over from PACKET-01.
- `getUserSessions` declares return type as `SpeakingSession[]` but `include` widens the actual Prisma result type. Should be tightened when the function is actively consumed in PACKET-03+.
- `package.json#prisma` seed config generates a deprecation warning — Prisma 7 will require `prisma.config.ts`. Not urgent.

---

## Validation

```bash
npx prisma generate   # ✅ Prisma Client v6.19.2 generated
npx prisma db push    # ✅ all 6 tables created in Neon
npx tsc --noEmit      # ✅ zero errors
npm run build         # ✅ clean — 4 static pages
npm run lint          # ✅ no warnings or errors
```
