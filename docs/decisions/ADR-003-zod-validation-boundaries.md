# ADR-003: Zod on every API boundary

**Date:** 2026-04-03  
**Status:** Accepted  

## Context

TypeScript types disappear at runtime. API handlers receive JSON, form data, and third-party webhooks. Trusting unchecked input caused production bugs in past projects; the codebase standardises on runtime parsing at the edges.

## Decision

Use **Zod** to parse and narrow unknown input in route handlers and critical libraries. Examples: `processBodySchema` in `src/app/api/internal/process/route.ts`, `createDrillSchema` in `src/app/api/drills/route.ts`, `analysisResultSchema` in `src/lib/ai/analyze.ts` for LLM JSON, and launch token validation in `src/app/api/launch/validate/route.ts`. Prefer `safeParse` and map failures to `{ error, code }` HTTP responses.

## Alternatives considered

- **TypeScript-only types on `request.json()`** — no protection against malformed or hostile payloads.
- **Manual `if` checks** — inconsistent, verbose, and easy to skip on new endpoints.
- **JSON Schema + separate validator** — viable but duplicates mental model next to Prisma and TS.

## Consequences

- **Pros:** One library for env (`lib/env.ts`), APIs, and AI outputs; good error messages for debugging.
- **Cons:** Schemas must be updated when contracts change; drift between Zod and OpenAPI is mitigated by documenting both from the same source of truth (handlers).
- **Team norm:** New POST bodies get a schema before Prisma writes.
