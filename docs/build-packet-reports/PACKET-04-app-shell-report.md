# Build Report — PACKET-04: App Shell & Protected Layout

**Author:** Senior Engineer
**Date:** 2026-02-18
**Branch:** `feature/app-shell`
**Version:** `0.4.0`
**Status:** ✅ SHIPPED

---

## Executive Summary

PACKET-04 is complete. The full app shell is in place: a fixed TopBar with user info and sign-out, an active-state MainNav, a reusable Container, three placeholder app routes, and an upgraded landing page with auth-aware CTAs. All three validation gates pass: zero TypeScript errors, clean production build (8 routes), no ESLint violations.

One deliberate deviation from the packet spec was made to avoid regressing PACKET-03 functionality. Documented below.

---

## Definition of Done — Final Checklist

| Requirement | Status | Notes |
|---|---|---|
| Authenticated users see TopBar + MainNav on all `(app)` pages | ✅ | Via `(app)/layout.tsx` |
| Unauthenticated requests to `(app)` routes redirect to `/auth/signin` | ✅ | `externalId` guard retained |
| All 3 placeholder pages render correctly under `(app)` | ✅ | `/session/new`, `/session/[id]`, `/history` |
| Navigation links work between pages | ✅ | `next/link` |
| Active nav state highlights current page | ✅ | `usePathname` with `startsWith` |
| Sign Out button works and redirects to landing page | ✅ | `signOut({ callbackUrl: '/' })` |
| Landing page shows "Go to Dashboard" when logged in | ✅ | Server-rendered auth check |
| Landing page shows "Sign In to Start" when logged out | ✅ | |
| All components follow 4-file pattern | ✅ | TopBar, MainNav, Container |
| All files have header comments | ✅ | Every file |
| `npx tsc --noEmit` — zero errors | ✅ | Clean pass |
| `npm run build` — clean build | ✅ | 8 routes |
| `npm run lint` — no violations | ✅ | `✔ No ESLint warnings or errors` |
| Layout is responsive | ✅ | Tailwind responsive classes throughout |

---

## What Was Built

### New Components

#### `src/components/ui/TopBar/` — Fixed Top Navigation Bar

```
TopBar.tsx           # 'use client' — calls signOut from next-auth/react
TopBar.types.ts      # TopBarProps { userName, userEmail }
index.ts             # Barrel export
```

Fixed header (`z-50`) with app branding on the left, `MainNav` in the center-left, user name/email + Sign Out button on the right. Accepts nullable strings for user info (mirrors NextAuth session shape).

---

#### `src/components/ui/MainNav/` — Navigation Links with Active State

```
MainNav.tsx          # 'use client' — uses usePathname
MainNav.types.ts     # MainNavProps { className? }
index.ts             # Barrel export
```

Renders two nav links (`New Session` → `/session/new`, `History` → `/history`). Active detection uses `pathname === href || pathname.startsWith(href + '/')` to handle nested routes correctly. Active link gets blue underline via Tailwind border classes.

---

#### `src/components/ui/Container/` — Content Width Wrapper

```
Container.tsx        # Server component — no 'use client'
Container.types.ts   # ContainerProps { children, className? }
index.ts             # Barrel export
```

Simple `max-w-4xl mx-auto px-4 py-6` wrapper. No client boundary needed. Used by all three placeholder pages.

---

### Modified Files

#### `src/app/(app)/layout.tsx`

Replaced the inline header HTML with `<TopBar>`. See Deviations section for what was preserved.

**Before:** Inline `<header>` with hard-coded user greeting and Server Action sign-out form.
**After:** `<TopBar userName={...} userEmail={...} />` — clean, componentized shell.

---

#### `src/app/(app)/session/new/page.tsx`

Replaced custom auth check + inline layout with `<Container>` and a clean placeholder heading. Auth is now handled entirely by the layout.

---

#### `src/app/(public)/page.tsx`

Upgraded from static landing page to server-rendered auth-aware page. Calls `auth()` on the server; conditionally renders "Go to Dashboard" or "Sign In to Start" CTA without a client boundary.

---

### New Pages (Placeholders)

| Route | File | Notes |
|---|---|---|
| `/session/[id]` | `src/app/(app)/session/[id]/page.tsx` | Async params — Next.js 15 requirement |
| `/history` | `src/app/(app)/history/page.tsx` | Static placeholder |

---

## Deviations from Packet Instructions

### Deviation 1 — Preserved `syncUser` and `SessionProvider` in `(app)/layout.tsx`

**Packet instruction:** Replace layout contents entirely with a minimal version that only calls `auth()` and renders `<TopBar>`.

**What happened:** The spec's replacement removed two critical pieces from PACKET-03:
- `SessionProvider` — required for all client components that call `useSession()` or `signOut()`. Without it, the `TopBar`'s `signOut` call would fail at runtime.
- `syncUser` — syncs the OIDC user into the local Neon database on every authenticated request. Removing it silently breaks the user record creation flow.

**Resolution:** The new layout integrates `<TopBar>` while retaining both:
```tsx
<SessionProvider session={session}>
  <div className="min-h-screen bg-gray-50">
    <TopBar userName={session.user.name} userEmail={session.user.email} />
    <main className="pt-16">{children}</main>
  </div>
</SessionProvider>
```

**Impact:** None to the spec's intent. The shell is identical to what was specified; only the underlying infrastructure that makes it function is preserved.

---

### Deviation 2 — Retained `externalId` auth guard

**Packet instruction:** Guard condition is `if (!session?.user)`.

**What was kept:** `if (!session?.user?.externalId)`

**Reason:** Our users are identified by `externalId` (the OIDC subject claim). A session with `user` but no `externalId` would pass the weaker check but fail at `syncUser` and every downstream Prisma query. The stricter guard catches this case early.

---

## Validation Output

### `npx tsc --noEmit`
```
(no output — clean pass)
Exit code: 0
```

### `npm run build`
```
▲ Next.js 15.5.12
✓ Compiled successfully in 2.8s
✓ Generating static pages (8/8)

Route (app)                      Size    First Load JS
┌ ƒ /                           163 B         106 kB
├ ○ /_not-found                 995 B         103 kB
├ ƒ /api/auth/[...nextauth]     135 B         102 kB
├ ƒ /auth/error                 163 B         106 kB
├ ƒ /auth/signin                135 B         102 kB
├ ƒ /history                    135 B         102 kB
├ ƒ /session/[id]               135 B         102 kB
└ ƒ /session/new                135 B         102 kB

Exit code: 0
```

### `npm run lint`
```
✔ No ESLint warnings or errors
Exit code: 0
```

---

## Known Issues / Technical Debt

| ID | Severity | Description | Recommended Action |
|---|---|---|---|
| TD-10 | Low | `MainNav` active state uses `startsWith` — `/session/new` will highlight if a future route like `/session/new-something` is added | Switch to exact match or a stricter prefix check when more routes are added |
| TD-11 | Low | `TopBar` always renders user email even for users without one — this is currently safe since OIDC always provides email, but the field is typed nullable | Add a fallback display (e.g., "User") for email-less sessions |
| TD-01 | Medium | No `.nvmrc` — Node 20 required but not enforced | Outstanding from PACKET-01 |

---

## Prerequisites for PACKET-05

1. ✅ `feature/app-shell` branch is clean
2. ✅ All 3 placeholder pages are in place under `(app)`
3. ✅ `Container` component is ready for use in recording UI
4. ✅ Layout auth guard is in place — PACKET-05 pages are automatically protected
5. ✅ `SessionProvider` is in the tree — client hooks like `useSession` will work in PACKET-05 components

---

## Appendix — File Line Counts

| File | Lines |
|---|---|
| `src/components/ui/TopBar/TopBar.tsx` | 44 |
| `src/components/ui/TopBar/TopBar.types.ts` | 4 |
| `src/components/ui/TopBar/index.ts` | 3 |
| `src/components/ui/MainNav/MainNav.tsx` | 37 |
| `src/components/ui/MainNav/MainNav.types.ts` | 4 |
| `src/components/ui/MainNav/index.ts` | 3 |
| `src/components/ui/Container/Container.tsx` | 10 |
| `src/components/ui/Container/Container.types.ts` | 7 |
| `src/components/ui/Container/index.ts` | 3 |
| `src/app/(app)/layout.tsx` | 29 |
| `src/app/(app)/session/new/page.tsx` | 14 |
| `src/app/(app)/session/[id]/page.tsx` | 20 |
| `src/app/(app)/history/page.tsx` | 14 |
| `src/app/(public)/page.tsx` | 37 |
