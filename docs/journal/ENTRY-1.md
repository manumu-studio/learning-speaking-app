# ENTRY-1 — Project Scaffold

**Date:** 2026-02-18
**Type:** Infrastructure
**Branch:** `feature/scaffold`
**Version:** `0.1.0`

---

## What I Did

Bootstrapped the full project from scratch: Next.js 15, TypeScript strict mode, Tailwind CSS v4, Prisma, and the src/ folder structure defined in the system spec. Also wired up husky v8 pre-commit hooks to enforce lint, typecheck, and tests before every commit.

---

## What Went Differently

### `create-next-app` doesn't accept existing directories

The docs/ folder and `.cursorrules` were already in the project root. `create-next-app` unconditionally rejects any non-empty directory — no `--force` flag exists. Bootstrapped manually instead: wrote `package.json` directly, installed deps in batches, created all config files by hand. Same outcome, more control.

### `npm install tailwindcss` installs v4, not v3

Tailwind v4 ships a completely different PostCSS integration. Using `tailwindcss` as a PostCSS plugin throws a fatal error at build time. The fix is two changes:

1. Install `@tailwindcss/postcss` and use it as the PostCSS plugin
2. Replace `@tailwind base/components/utilities` in globals.css with `@import "tailwindcss"`

v4 also ships `@tailwindcss/oxide`, a Rust-based engine that requires **Node ≥ 20**. Packages installed under Node 18 produce broken native bindings when later run under Node 20. Required a full `node_modules` wipe and clean reinstall under Node 20.

### `eslint-config-next` v16 ships native flat config — `FlatCompat` breaks it

The standard `FlatCompat` approach for ESLint flat configs crashes with a circular JSON error when loading `eslint-config-next` v16:

```
TypeError: Converting circular structure to JSON
    --> property 'react' closes the circle
```

Root cause: `FlatCompat` tries to serialize the config for validation, but the React plugin object contains a self-reference. Fix: import the flat config modules directly, bypassing `FlatCompat` entirely.

```js
import coreWebVitals from 'eslint-config-next/core-web-vitals';
import typescript from 'eslint-config-next/typescript';
```

---

## Pre-commit Hooks

The repo already had a `.husky/` folder with a `pre-commit` script written for `pnpm`. Since this project uses `npm`, all three commands needed updating. Also added the three missing `package.json` scripts:

- `"typecheck"` → `tsc --noEmit` (was missing, referenced in hook)
- `"test"` → placeholder `exit 0` (no test framework yet — hook must pass without blocking)
- `"prepare"` → `husky install` (runs automatically on `npm install`, activates git hooks)

Installed `husky@8` specifically — the existing `.husky/_/husky.sh` bootstrap is the v8 format. Using v9 would generate a different hook structure and break the existing file.

---

## Decisions

**`noUncheckedIndexedAccess: true`** — makes array/object index access return `T | undefined` instead of `T`. Stricter than the packet required. Correct for a codebase that handles user data.

**`globalThis` singleton for Prisma** — standard Next.js pattern. Without it, hot module reload in dev creates multiple PrismaClient instances and exhausts the connection pool.

**`env.ts` fails at import time** — `envSchema.parse(process.env)` runs when the module is first imported, not lazily. The app crashes immediately at startup with a clear Zod error if a required variable is missing. Preferable to silent undefined failures deep in request handlers.

---

## Still Open

- No `.nvmrc` — Node 20 requirement is implicit, not enforced. Anyone cloning this will hit Tailwind v4 native binding errors on Node 18. Fix in PACKET-02.
- `tailwind.config.ts` is present but unused — v4 reads config from CSS. Clean up later.
- `next lint` prints a deprecation notice (Next.js 16 will remove it). Not urgent.
- `npm run test` is a no-op — pre-commit hook passes, but the test gate provides no actual coverage. Real test framework (likely Vitest) to be added in a future packet.

---

## Validation

```bash
npx tsc --noEmit      # ✅ zero errors
npm run build         # ✅ clean — 4 static pages
npm run lint          # ✅ no warnings or errors
npm run typecheck     # ✅ zero errors
npm run test          # ✅ placeholder passes
```

Pre-commit hook verified: fires on `git commit`, runs all three checks in sequence.
