# Testing guide

How tests are organised in the Learning Speaking App and how to extend them without fighting the toolchain.

## Strategy (pyramid)

| Layer | Tool | What it covers |
|--------|------|----------------|
| **Unit / hook** | Vitest (`node` or `jsdom`) | Pure logic, hooks with mocked `fetch`, lib utilities |
| **Component** | Vitest + RTL + `jsdom` | UI behaviour, a11y interactions, theme providers |
| **Integration** | Vitest | Route modules, middleware helpers, pipeline edge cases with mocks |
| **E2E** | Playwright | Real browser flows against running dev server |

Coverage thresholds (statements/branches/functions/lines) live in `vitest.config.ts` under `test.coverage.thresholds`. The `include` scope is `src/lib/**` and `src/features/**` (see `coverage.include`).

## Running tests

```bash
npm run test              # single Vitest run
npm run test:watch        # watch mode
npm run test:coverage     # run + coverage report (text + lcov)
npm run test:e2e          # Playwright (starts dev server if needed)
npm run test:e2e:ui       # Playwright UI
```

E2E sets `E2E_TEST_USER=true` on the web server via `playwright.config.ts` so rate limiting middleware steps aside in non-production.

## Unit and hook tests

**Prisma** — The global mock is registered in `vitest.config.ts` `setupFiles` → `src/__mocks__/prisma.ts`. Import `@/lib/prisma` in tests and cast or extend the mock as in existing feature tests.

**fetch** — Stub with `vi.stubGlobal('fetch', vi.fn())`, return shaped `Response` promises. Example from `useDrill.test.ts`:

```typescript
vi.mocked(fetch).mockImplementation((input) => {
  const url = String(input);
  if (url.includes('/api/drills/drill-1')) {
    return jsonResponse({ ...baseDrillJson, completedAt: null });
  }
  return jsonResponse({}, false, 404);
});
```

**Arrange–Act–Assert** — One behaviour per `it`; use `renderHook` / `waitFor` for async hooks.

## Integration-style tests

API helpers and middleware are tested without booting Next: build a `Request`, call exported handlers, assert `Response` status and JSON. See `src/lib/pipeline/pipelineRouteFailure.test.ts` and `src/middleware.test.ts`.

## Component tests

Files matching `src/**/*.test.tsx` use `jsdom` (`environmentMatchGlobs` in `vitest.config.ts`). Shared DOM matchers ship from `src/__mocks__/rtl-setup.ts`.

## E2E tests

Specs live in `e2e/`. `playwright.config.ts` pins Chromium, `baseURL`, and `webServer` command (`npm run dev:e2e` in CI). Prefer stable selectors (`getByRole`, `data-testid` only when necessary).

## Coverage and what to skip

- Generated or purely presentational barrels (`index.ts`) are excluded from coverage.
- Do not duplicate Zod schemas in tests — assert on HTTP status and key response fields.
- When adding a hook with side effects, add a co-located `*.test.ts` before merging.

## Conventions

- **Naming:** `*.test.ts` / `*.test.tsx` next to source (or under `src/__tests__` for cross-cutting cases).
- **`describe` / `it`:** Mirror public API or user-visible behaviour, not internal function names only.
- **No `console.log`** in production code; tests may use `vi.spyOn` on logger if needed.
