# ENTRY-launch — Launch Event QR Access System + Route Lockdown

**Date:** 2026-02-20
**Type:** Feature
**Branch:** `feature/processing-pipeline`
**Version:** `0.8.1`

---

## What I Did

Built an exclusive QR-gated access system for the LSA launch event (Feb 25, 2026). Five physical invitation cards each contain a unique QR code that routes guests to a personalized welcome experience. Also locked down all app routes to public-only access during the launch period, and extracted a `generate-qr-codes.ts` script for producing print-ready PNG files.

---

## Files Touched

| File | Action | Notes |
|---|---|---|
| `src/config/launch-guests.ts` | Created | Static token → guest map (5 guests, 22-char base64url tokens) |
| `src/app/api/launch/validate/route.ts` | Created | POST — validates QR token, returns guest name |
| `src/components/ui/QrScanner/QrScanner.tsx` | Created | Full-screen camera QR scanner overlay (`html5-qrcode`) |
| `src/components/ui/QrScanner/QrScanner.types.ts` | Created | `QrScannerProps` interface |
| `src/components/ui/QrScanner/QrScanner.module.css` | Created | Scanner overlay styles |
| `src/components/ui/QrScanner/index.ts` | Created | Barrel export |
| `src/app/(public)/explanation/page.tsx` | Created | Server component — validates token, renders or redirects |
| `src/app/(public)/explanation/ExplanationContent.tsx` | Created | Apple WWDC-style scroll experience with 5 sections |
| `src/app/(public)/explanation/explanation.module.css` | Created | Scroll-triggered CSS animations |
| `src/app/(public)/explanation/useScrollAnimation.ts` | Created | IntersectionObserver hook for viewport entry animations |
| `src/app/(public)/launch/LaunchContent.tsx` | Created | Countdown page — wires Enter button to QR scanner (mobile) / token input (desktop) |
| `src/app/(public)/launch/launch.module.css` | Created | Launch page styles |
| `src/app/(public)/launch/page.tsx` | Created | Static wrapper for `LaunchContent` |
| `src/app/api/launch/validate/route.ts` | Created | Token validation API endpoint |
| `src/middleware.ts` | Modified | Replaced auth middleware with launch-mode allowlist |
| `scripts/generate-qr-codes.ts` | Created | Node.js script — generates 5 print-ready QR PNGs |
| `scripts/tsconfig.json` | Created | CommonJS override for ts-node script execution |
| `public/qr-codes/qr-*.png` | Generated | 5 QR codes at 1000×1000px, white-on-black, error correction H |
| `src/features/session/useSessionStatus.types.ts` | Created | Extracted `SessionDetail` + `UseSessionStatusReturn` from hook file |

---

## Decisions

**Static config over DB for guests** — 5 guests is too small for a DB table. A `.ts` config file is simpler, type-safe, and requires no migrations. Tokens are pre-generated cryptographically random base64url strings hardcoded at build time.

**Token in query string, not path** — `/explanation?token=X` instead of `/explanation/X`. Keeps the route structure flat, avoids a dynamic segment just for a one-time event, and makes server-side validation trivial via `searchParams`.

**Server component validates token** — The `explanation/page.tsx` is a server component that reads `searchParams`, calls `validateToken()`, and redirects to `/launch` if invalid. No client-side token exposure, no loading state needed.

**Middleware allowlist approach** — Rather than adding guards to every individual route, a single middleware function with an allowlist is cleaner and guarantees nothing leaks. The matcher regex excludes `_next`, static assets, and public files so they're never evaluated.

**`html5-qrcode` for camera scanning** — Web-standard approach using the browser's `getUserMedia` API. No native app dependency. Falls back gracefully to a token input field on desktop where camera scanning is inconvenient.

**QR settings: error correction H + 1000px** — H-level error correction survives up to 30% physical damage (scratches, smudges on physical cards). 1000px ensures print quality at typical card sizes without upscaling artifacts.

**`useSessionStatus.types.ts` extraction** — Minor fix to enforce the 4-file pattern consistently. `SessionDetail` and `UseSessionStatusReturn` were inline in the hook file; moved to a sibling `.types.ts` file to match the rest of the codebase.

---

## How It Works

```
Physical card → QR scan → /explanation?token=X
                               ↓
                    Server validates token
                               ↓
               Valid → render ExplanationContent (personalized)
               Invalid → redirect to /launch
```

Scroll sections in `ExplanationContent`:
1. **Hero** — "Welcome, [Name]" (full viewport, fade up)
2. **Exclusivity** — "One of five. Chosen for you."
3. **Event** — What this gathering is
4. **App overview** — Brief LSA intro
5. **Closing** — What to expect on Feb 25

---

## Validation

```bash
npx tsc --noEmit   # ✅ zero errors
npm run build      # ✅ clean build
npm run lint       # ✅ no violations
npm run qr:generate  # ✅ 5 PNGs generated in public/qr-codes/
```
