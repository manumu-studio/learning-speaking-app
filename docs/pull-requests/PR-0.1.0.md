# PR-0.1.0 — Project Scaffold

**Branch:** `feature/scaffold` → `main`
**Version:** `0.1.0`
**Date:** 2026-02-18

---

## What Changed

- Initialized Next.js 15 App Router with TypeScript strict mode
- Created full `src/` folder structure (`app/`, `components/ui/`, `features/`, `lib/`)
- Built `env.ts` (Zod validation), `prisma.ts` (singleton), `utils.ts` (`cn()`)
- Configured Tailwind CSS v4, PostCSS, ESLint flat config
- Created landing page and protected layout shell
- Created empty Prisma schema and `.env.example`
- Installed husky v8 and configured pre-commit hooks (lint + typecheck + test)

---

## Files

| File | Action | Notes |
|---|---|---|
| `package.json` | Created | Next.js 15.5, React 19, all packet deps |
| `tsconfig.json` | Created | strict + noUncheckedIndexedAccess + noImplicitReturns |
| `next.config.ts` | Created | `outputFileTracingRoot` set to project root |
| `tailwind.config.ts` | Created | content paths for `src/` |
| `postcss.config.mjs` | Created | `@tailwindcss/postcss` (Tailwind v4 plugin) |
| `eslint.config.mjs` | Created | native flat config — no FlatCompat |
| `.gitignore` | Created | `.env*.local`, `.next/`, `node_modules` |
| `.env.example` | Created | all 16 variable keys documented |
| `src/app/layout.tsx` | Created | root layout + global CSS |
| `src/app/globals.css` | Created | `@import "tailwindcss"` (v4 syntax) |
| `src/app/(public)/page.tsx` | Created | landing page, no auth |
| `src/app/(app)/layout.tsx` | Created | protected layout — auth guard added in PACKET-03 |
| `src/lib/env.ts` | Created | Zod parse-on-import, fails fast on missing vars |
| `src/lib/prisma.ts` | Created | globalThis singleton, hot-reload safe |
| `src/lib/utils.ts` | Created | `cn()` via clsx + tailwind-merge |
| `prisma/schema.prisma` | Created | empty shell — models added in PACKET-02 |
| `package.json` scripts | Modified | added `typecheck`, `test`, `prepare` |
| `.husky/pre-commit` | Modified | swapped `pnpm` → `npm run` for all three checks |

---

## Decisions

| Decision | Why |
|---|---|
| Manual bootstrap instead of `create-next-app` | CLI rejects non-empty directories — `docs/` already existed |
| `@tailwindcss/postcss` instead of `tailwindcss` as PostCSS plugin | Tailwind v4 extracted PostCSS integration to a separate package |
| `@import "tailwindcss"` in globals.css | v4 replaced `@tailwind base/components/utilities` directives |
| Native `eslint-config-next` flat config imports | `FlatCompat` causes circular JSON crash with eslint-config-next v16 |
| Node 20 required | `@tailwindcss/oxide` native bindings require Node ≥ 20 |
| `test` script is a no-op placeholder | No test framework installed in PACKET-01 — hook must pass cleanly without blocking commits |
| `husky@8` over v9 | `.husky/_/husky.sh` bootstrap already present in the repo — matched existing format |

---

## Validation

```bash
npx tsc --noEmit      # ✅ zero errors
npm run build         # ✅ clean — 4 static pages
npm run lint          # ✅ no warnings or errors
npm run typecheck     # ✅ zero errors
npm run test          # ✅ placeholder passes
```

Pre-commit hook verified: `git commit` triggers lint → typecheck → test in sequence. Any non-zero exit blocks the commit.

---

## Notes

- **Node 20 required** — run `nvm use 20` before any `npm` command. No `.nvmrc` yet — add in PACKET-02.
- `.env.local` must be populated from `.env.example` before running locally
- `npx prisma generate` must be run before `npm run build` (Prisma schema is empty but client stubs are needed for TypeScript)
- `npm run test` is a placeholder (`exit 0`) — real test suite added in a future packet
- `npm install` triggers `prepare` automatically, which runs `husky install` and activates git hooks
