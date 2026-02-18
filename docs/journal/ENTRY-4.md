# ENTRY-4 — App Shell & Protected Layout

**Date:** 2026-02-18
**Type:** Feature
**Branch:** `feature/app-shell`
**Version:** `0.4.0`

---

## What I Did

Implemented the app shell — the persistent chrome that authenticated users see on every protected page. Built three new UI components (TopBar, MainNav, Container), three placeholder pages, and updated the protected layout and landing page.

---

## Files Touched

| File | Action | Notes |
|---|---|---|
| `src/components/ui/TopBar/TopBar.tsx` | Created | `'use client'` — calls `signOut` from `next-auth/react` |
| `src/components/ui/TopBar/TopBar.types.ts` | Created | `TopBarProps` interface |
| `src/components/ui/TopBar/index.ts` | Created | Barrel export |
| `src/components/ui/MainNav/MainNav.tsx` | Created | `'use client'` — active state via `usePathname` |
| `src/components/ui/MainNav/MainNav.types.ts` | Created | `MainNavProps` interface |
| `src/components/ui/MainNav/index.ts` | Created | Barrel export |
| `src/components/ui/Container/Container.tsx` | Created | Server component — `max-w-4xl` wrapper |
| `src/components/ui/Container/Container.types.ts` | Created | `ContainerProps` interface |
| `src/components/ui/Container/index.ts` | Created | Barrel export |
| `src/app/(app)/session/[id]/page.tsx` | Created | Results placeholder — async params (Next.js 15) |
| `src/app/(app)/history/page.tsx` | Created | History placeholder |
| `src/app/(app)/layout.tsx` | Modified | Replaced inline header with `<TopBar>` |
| `src/app/(app)/session/new/page.tsx` | Modified | Simplified to `<Container>` placeholder |
| `src/app/(public)/page.tsx` | Modified | Auth-aware CTAs via server-side `auth()` |

---

## What Went Differently

### Spec replacement would have dropped PACKET-03 functionality

The packet spec's `layout.tsx` replacement removed `SessionProvider` and `syncUser`. Without `SessionProvider`, `signOut` in `TopBar` fails at runtime (no context). Without `syncUser`, users stop being synced to the Neon DB after sign-in — silent regression with no immediate error. Integrated `<TopBar>` alongside both rather than replacing them.

---

## Decisions

**`SessionProvider` and `syncUser` preserved in layout** — Not a deviation from the shell design, just preserving infrastructure that the shell depends on. `SessionProvider` is the context boundary that makes `TopBar`'s client-side `signOut` work.

**Stricter auth guard retained (`externalId` not just `user`)** — A session with `user` but no `externalId` would pass the weaker guard but fail at `syncUser` and every Prisma query downstream. The stricter check catches this at the layout boundary.

**`MainNav` uses `startsWith` for active state** — Handles nested routes (e.g., `/session/abc123` falls under the session route group) without false positives.

**`session/[id]/page.tsx` uses `Promise<{ id: string }>` params** — Next.js 15 requirement. Async params are not optional.

---

## Still Open

- `getUserSessions` return type still unresolved (carried from ENTRY-2)
- No `.nvmrc` — Node 20 requirement still not enforced (carried from ENTRY-1)
- `MainNav` `startsWith` could produce false positives if a route like `/session/new-something` is added later

---

## Validation

```bash
npx tsc --noEmit   # ✅ zero errors
npm run build      # ✅ clean — 8 routes
npm run lint       # ✅ no warnings or errors
```
