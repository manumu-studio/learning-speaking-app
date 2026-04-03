# Contributing to Learning Speaking App

Thank you for helping improve the speaking coach. This document is the fastest path from zero to a passing PR.

## Getting started

**Prerequisites**

- **Node.js 20+** (required by `package.json` engines and Tailwind v4)
- **PostgreSQL** — local or [Neon](https://neon.tech)
- **Cloudflare R2** — bucket + API credentials for audio uploads
- **API keys** — OpenAI (Whisper), Anthropic (Claude), optional for full pipeline
- **Upstash** — QStash (async pipeline) and optionally Redis (rate limiting)

**Setup**

```bash
git clone https://github.com/manumu-studio/learning-speaking-app.git
cd learning-speaking-app
npm install
cp .env.example .env.local   # fill all required vars (see .env.example headers)
npx prisma migrate deploy    # apply database migrations
npm run dev
```

**Environment** — Every variable is documented in `.env.example`. Required blocks are marked there; optional sections disable features gracefully when empty.

## Development workflow

- **Branches:** `feature/short-description` or `fix/short-description`
- **Commits:** [Conventional Commits](https://www.conventionalcommits.org/) — `feat:`, `fix:`, `chore:`, `refactor:`, `docs:`
- **PRs:** Small, focused changes; describe what changed and how to verify. Link to the versioned PR doc in `docs/pull-requests/` when the maintainer workflow asks for it.

## Code standards

- **TypeScript:** `strict` mode, no `any`, no non-null `!`, prefer union string literals over enums
- **Components:** Four-file folder pattern — `Name.tsx`, `Name.types.ts`, `index.ts`, optional `useName.ts`
- **Imports:** Use `@/` path alias
- **API routes:** Validate auth before DB work; scope Prisma queries with `userId` where applicable
- **Env:** Read configuration through Zod-validated `lib/env.ts`, not raw `process.env` in scattered call sites
- **Errors:** JSON shape `{ error: string, code?: string }` with appropriate HTTP status
- **File headers:** One-line comment at the top of each source file describing its purpose

## Testing

| Command | Purpose |
|--------|---------|
| `npm run test` | Vitest — unit + integration + component tests (single run) |
| `npm run test:watch` | Vitest watch mode |
| `npm run test:coverage` | Coverage report + threshold check (see `vitest.config.ts`) |
| `npm run test:e2e` | Playwright (Chromium); can auto-start dev server |
| `npm run test:e2e:ui` | Playwright UI mode |

**Patterns:** Prisma is mocked in `src/__mocks__/prisma.ts`; RTL setup in `src/__mocks__/rtl-setup.ts`. Prefer co-located `*.test.ts` / `*.test.tsx` next to the code under test. See `docs/TESTING.md` for examples pulled from this repo.

## Quality gates

Before opening a PR, run:

```bash
npx tsc --noEmit && npm run lint && npm run test && npm run build
```

CI runs the same expectations on Node 20.

## Architecture

High-level behaviour and data flow live in `docs/architecture/SYSTEM_SPEC.md` and `docs/architecture/SYSTEM_DIAGRAM.md`. API contracts are in `docs/api/openapi.yaml` (interactive UI at `/api/docs` in development).

## Documentation

- Keep **README** links accurate when you add user-facing docs
- **Journal-style entries** for releases: `docs/journal/ENTRY-N.md` (date, summary, files, decisions)
- **PR descriptions** for releases: `docs/pull-requests/PR-X.Y.Z.md`
- Register new journal/PR rows in `docs/DEVELOPMENT_JOURNAL.md`

Write for humans maintaining the product — avoid internal tooling names in public-facing journal or PR text.
