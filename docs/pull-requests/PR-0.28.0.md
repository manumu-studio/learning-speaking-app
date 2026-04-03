# PR-0.28.0 — Documentation excellence (API spec, guides, ADRs)

**Branch:** `feature/documentation-excellence` → `main`  
**Version:** `0.28.0`  
**Date:** 2026-04-03  
**Status:** Ready to merge

---

## Summary

Adds external-facing documentation: OpenAPI 3.1 (`docs/api/openapi.yaml`) with Redocly lint config, interactive Swagger UI under `/api/docs` for local development, `CONTRIBUTING.md`, six ADRs in `docs/decisions/`, `docs/architecture/SYSTEM_DIAGRAM.md` (Mermaid), `docs/TESTING.md`, `docs/DEPLOYMENT.md`, README documentation links, and focused JSDoc on complex types. Bumps the app version to `0.28.0`. Adds optional `@tailwindcss/oxide-darwin-arm64` so macOS developers get a working Tailwind native binding alongside existing Linux optionals.

## Files Changed

| File | Action | Notes |
|------|--------|--------|
| `docs/api/openapi.yaml`, `redocly.yaml` | Added | API contract + lint config |
| `src/app/api/docs/page.tsx`, `spec/route.ts`, `loading.tsx` | Added | Dev Swagger |
| `next.config.ts` | Modified | Transpile Swagger UI |
| `package.json`, `package-lock.json` | Modified | Version, dev deps, darwin oxide optional |
| `CONTRIBUTING.md` | Added | Contributor onboarding |
| `docs/decisions/*.md` (6) | Added | ADRs |
| `docs/architecture/SYSTEM_DIAGRAM.md` | Added | Diagrams |
| `docs/TESTING.md`, `docs/DEPLOYMENT.md` | Added | Guides |
| `README.md` | Modified | Doc links |
| Various `.types.ts` + `getDashboardData.ts` + `analyze.ts` | Modified | JSDoc |

## Architecture Decisions

| Decision | Why |
|----------|-----|
| OpenAPI reflects actual routes | Avoids misleading consumers (e.g. no `PATCH` session route in code) |
| Swagger only outside production | Reduces attack surface and bundle concerns in prod |
| ADRs in-repo | Captures “why” for auth, queue, validation, UI structure, metrics, storage |

## Testing Checklist

- [x] `npx tsc --noEmit`
- [x] `npm run lint`
- [x] `npm run test`
- [x] `npm run build` (Node 20)
- [ ] Manually open `/api/docs` with `npm run dev` and confirm spec loads

## Deployment Notes

No database migrations. No new production secrets. Ensure production `NODE_ENV` remains `production` so `/api/docs` and `/api/docs/spec` stay disabled as implemented.

## Validation

```text
npx tsc --noEmit   # exit 0
npm run lint       # exit 0
npm run test       # 214 tests passed
npm run build      # exit 0
npx @redocly/cli@1 lint   # exit 0
```
