# ENTRY-28 — External documentation and API reference

**Date:** 2026-04-03  
**Type:** Infrastructure  
**Branch:** `feature/documentation-excellence`  
**Version:** `0.28.0`

---

## What I Did

Shipped a full documentation pass aimed at contributors and operators: OpenAPI 3.1 for the HTTP surface (including CSRF, session auth, QStash webhook, and rate-limit behaviour), Swagger UI at `/api/docs` in non-production builds, root-level contributing guidelines, six architecture decision records, Mermaid system diagrams, testing and deployment guides, and README links tying the set together. Added targeted JSDoc on the heaviest dashboard and training type surfaces plus `getDashboardData` and the Claude analysis schema. Introduced Redocly configuration for repeatable spec linting and an optional Tailwind Oxide native package so macOS ARM installs resolve the PostCSS binding cleanly alongside existing Linux optional deps.

## Files Touched

| File / area | Action | Notes |
|-------------|--------|--------|
| `docs/api/openapi.yaml` | Added | Routes aligned with App Router handlers (includes `GET /api/sessions` list; `DELETE` where older specs assumed `PATCH`) |
| `redocly.yaml` | Added | Pragmatic lint rules for the spec |
| `src/app/api/docs/*` | Added | Swagger UI page, spec JSON route, loading UI |
| `next.config.ts` | Modified | `transpilePackages: ['swagger-ui-react']` |
| `package.json` / lockfile | Modified | `0.28.0`, Swagger + yaml dev deps, optional `@tailwindcss/oxide-darwin-arm64` |
| `CONTRIBUTING.md` | Added | Setup, workflow, standards, testing, quality gates |
| `docs/decisions/ADR-001` … `ADR-006` | Added | Auth, QStash, Zod, component layout, metrics, R2 |
| `docs/architecture/SYSTEM_DIAGRAM.md` | Added | Data flow, auth, drills |
| `docs/TESTING.md`, `docs/DEPLOYMENT.md` | Added | Commands, patterns, prod checklist |
| `README.md` | Modified | Documentation section + slimmer body |
| `src/features/**/dashboard.types.ts`, `training.types.ts`, `useSessionStatus.types.ts`, `MetricCard.types.ts`, `DrillView.types.ts`, `ErrorBoundary.types.ts`, `getDashboardData.ts`, `analyze.ts` | Modified | Purpose-focused JSDoc |

## Decisions

- **Spec truth over legacy tables** — OpenAPI documents `DELETE /api/sessions/{id}` and lists `GET /api/sessions` because that is what ships.
- **Dev-only Swagger** — Same-origin spec URL; production responses avoid exposing interactive docs.
- **Redocly `struct` off** — JSON Schema 2020-12 nullability and response `description` verbosity are enforced in review rather than blocking local lint.
- **Darwin Oxide optional** — Mirrors the existing Linux optional native pattern so `next build` works on Apple Silicon without wiping `node_modules`.

## Still Open

- Consider generating a subset of OpenAPI from Zod in a later iteration to reduce drift.
- Swagger UI peer dependencies still target React 18 internally; monitor for upstream updates.

## Validation

```text
npx tsc --noEmit   # exit 0
npm run lint       # exit 0, no warnings
npm run test       # 43 files, 214 tests passed
npm run build      # exit 0 (Node 20)
npx @redocly/cli@1 lint   # exit 0 with redocly.yaml
```
