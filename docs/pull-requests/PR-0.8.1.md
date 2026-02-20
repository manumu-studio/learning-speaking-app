# PR-0.8.1 — Launch Event QR Access System

**Branch:** `feature/processing-pipeline` → `main`
**Version:** `0.8.1`
**Date:** 2026-02-20
**Status:** ✅ Ready to merge

---

## Summary

Exclusive QR-gated access experience for the LSA launch event (Feb 25, 2026). Five physical invitation cards encode unique QR codes that unlock a personalized welcome page. All non-launch routes are locked down via middleware for the duration of the event.

---

## What Was Built

### Guest Access Flow

| File | Purpose |
|---|---|
| `src/config/launch-guests.ts` | Token → guest map (5 guests, cryptographic base64url tokens) |
| `src/app/api/launch/validate/route.ts` | POST endpoint — validates token, returns guest name |
| `src/app/(public)/launch/LaunchContent.tsx` | Countdown page — Enter → QR scanner (mobile) / token input (desktop) |
| `src/app/(public)/launch/launch.module.css` | Launch page styles |
| `src/app/(public)/launch/page.tsx` | Static wrapper |

### QR Scanner Component (4-file pattern)

| File | Purpose |
|---|---|
| `src/components/ui/QrScanner/QrScanner.tsx` | Full-screen camera overlay using `html5-qrcode` |
| `src/components/ui/QrScanner/QrScanner.types.ts` | `QrScannerProps` interface |
| `src/components/ui/QrScanner/QrScanner.module.css` | Overlay styles |
| `src/components/ui/QrScanner/index.ts` | Barrel export |

### Explanation Experience

| File | Purpose |
|---|---|
| `src/app/(public)/explanation/page.tsx` | Server component — validates token or redirects |
| `src/app/(public)/explanation/ExplanationContent.tsx` | Personalized Apple WWDC-style scroll experience |
| `src/app/(public)/explanation/explanation.module.css` | Scroll-triggered CSS animations |
| `src/app/(public)/explanation/useScrollAnimation.ts` | IntersectionObserver hook |

### Infrastructure

| File | Purpose |
|---|---|
| `src/middleware.ts` | Launch-mode allowlist — only `/launch`, `/explanation`, `/api/launch/validate` pass through |
| `scripts/generate-qr-codes.ts` | Generates 5 print-ready QR PNGs (1000×1000px, white-on-black, error correction H) |
| `scripts/tsconfig.json` | CommonJS override for ts-node |
| `public/qr-codes/qr-*.png` | Generated QR codes for all 5 guests |
| `src/features/session/useSessionStatus.types.ts` | Types extracted from hook file (4-file pattern consistency) |

---

## Architecture Decisions

| Decision | Rationale |
|---|---|
| Static `.ts` config for guests | 5 guests doesn't justify a DB table; type-safe, zero migrations |
| Token in query string | Flat URL structure, server-side validation without dynamic segments |
| Server component validates token | No client-side token exposure; redirect on invalid token without loading states |
| Middleware allowlist | Single control point — guarantees no accidental route exposure without per-route guards |
| QR error correction H | Survives up to 30% physical damage on printed cards |

---

## Validation

```bash
npx tsc --noEmit     # ✅ zero errors
npm run build        # ✅ clean build
npm run lint         # ✅ no violations
npm run qr:generate  # ✅ 5 PNGs in public/qr-codes/
```

---

## Testing Checklist

- [x] `npx tsc --noEmit` passes
- [x] `npm run build` passes
- [x] `npm run lint` passes
- [x] QR codes generated at correct resolution (1000×1000px)
- [ ] Navigate to `/launch` — countdown renders, theme toggle works
- [ ] Scan valid QR on mobile — redirects to `/explanation?token=...`
- [ ] `/explanation?token=VALID` — personalized name renders, scroll animations trigger
- [ ] `/explanation?token=INVALID` — redirects to `/launch`
- [ ] `/explanation` (no token) — redirects to `/launch`
- [ ] Any blocked route (e.g. `/session`, `/history`, `/`) — redirects to `/launch`
- [ ] Static assets (`/_next/`, `/assets/`) — serve normally (not blocked)

---

## Deployment Notes

- No new environment variables required
- No DB migrations
- New dependency: `qrcode` + `@types/qrcode` (dev — script only, not bundled)
- New dependency: `html5-qrcode` (client bundle — camera QR scanning)
- QR codes in `public/qr-codes/` are committed and served as static assets
- To regenerate QR codes for production domain: `BASE_URL=https://yourdomain.com npm run qr:generate`

---

## Post-Launch

When the event is over and the full app should be accessible, revert `src/middleware.ts` to the original auth-protecting middleware (see git history).
