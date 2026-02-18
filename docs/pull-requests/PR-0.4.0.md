# PR-0.4.0 — App Shell & Protected Layout

**Branch:** `feature/app-shell` → `main`
**Version:** `0.4.0`
**Date:** 2026-02-18
**Packet:** PACKET-04

---

## Summary

Adds the persistent app shell for authenticated users: a fixed TopBar with branding and navigation, a MainNav with active-state highlighting, a Container layout utility, and placeholder pages for the three core app routes. Also upgrades the public landing page to show context-aware CTAs.

---

## What Was Built

### New Components

| Component | Purpose |
|---|---|
| `TopBar` | Fixed header with app name, MainNav, user info, and Sign Out button |
| `MainNav` | Navigation links (`New Session`, `History`) with active-state highlighting via `usePathname` |
| `Container` | Reusable max-width content wrapper (`max-w-4xl`) used by all pages |

All components follow the 4-file pattern (`Component.tsx`, `Component.types.ts`, `index.ts`).

### Modified Files

- **`(app)/layout.tsx`** — Replaced inline header HTML with `<TopBar>`. Preserved `syncUser` (DB sync) and `SessionProvider` (client auth state) from PACKET-03.
- **`(app)/session/new/page.tsx`** — Simplified to placeholder using `<Container>`.
- **`(public)/page.tsx`** — Now server-renders auth state to show "Go to Dashboard" vs "Sign In to Start".

### New Pages (Placeholders)

- `/session/[id]` — Results page stub (PACKET-07)
- `/history` — History list stub (PACKET-07)

---

## Architecture Decisions

| Decision | Rationale |
|---|---|
| `SessionProvider` + `syncUser` preserved in layout | Spec replacement would have silently broken client-side auth context and DB user sync |
| Auth guard checks `externalId`, not just `user` | Prevents sessions without a DB-linked user from passing through |
| `TopBar` uses `signOut` from `next-auth/react` | `SessionProvider` is already in the tree; client-side sign-out is the correct layer |
| `session/[id]/page.tsx` uses `Promise<{ id: string }>` | Next.js 15 async params requirement |

---

## Validation Gates

```bash
npx tsc --noEmit   # ✅ zero errors
npm run build      # ✅ clean — 8 routes
npm run lint       # ✅ no warnings or errors
```

---

## Testing Checklist

- [ ] Authenticated user sees TopBar on `/session/new`, `/history`, `/session/[id]`
- [ ] Unauthenticated request to `/session/new` redirects to `/auth/signin`
- [ ] `New Session` nav link highlights on `/session/new`
- [ ] `History` nav link highlights on `/history`
- [ ] Sign Out redirects to `/`
- [ ] Landing page shows "Go to Dashboard" when logged in
- [ ] Landing page shows "Sign In to Start" when logged out
- [ ] Layout is responsive on mobile

---

## Deployment Notes

No new environment variables. No schema changes. No migrations required.
