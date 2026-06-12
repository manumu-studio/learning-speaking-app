# ENTRY-79 — 2026-06-12

**Type:** Security / Maintenance
**Version:** 0.72.0
**Branch:** fix/dependency-security-audit

## Summary

Closed the critical and high vulnerabilities in production dependencies and patched the
critical CVEs in the test runner. Removed an unmaintained package that had no available
security fix. A follow-up pass will address the remaining test-environment advisories.

## What Changed

- Updated vitest and @vitest/coverage-v8 from 3.2.4 to 3.2.6 — patches critical CVEs in
  the underlying esbuild bundler chain (same-minor, non-breaking)
- Removed xlsx from production dependencies — the package carries 2 critical CVEs with no
  upstream fix available. It was only used in a one-time corpus seeding script
  (`scripts/seed-corpus.ts`). The seed function now soft-skips the xlsx-dependent logic
  with a clear comment on how to restore it if a fresh re-seed is ever needed

## Files Touched

- `package.json` — vitest and @vitest/coverage-v8 version bumps; xlsx removed
- `package-lock.json` — updated per package changes
- `scripts/seed-corpus.ts` — xlsx require replaced with a soft-skip guard

## Key Decisions

- **xlsx removal over patching:** No patched version exists. Since the script is a
  one-time migration tool and the corpus is already seeded, removal is the only clean path.
  A guard comment tells future developers how to temporarily restore the dep if re-seeding
  is ever needed.
- **Scope kept narrow:** the test-DOM upgrade (happy-dom) and the full-tree audit CI gate
  are intentionally held back for a dedicated dev-toolchain pass — the happy-dom upgrade is
  a three-major version jump that needs its own test-suite validation and shouldn't ride in
  a security patch.

## Still Open

- happy-dom test-environment CVEs (require a 17 → 20 major upgrade) — tracked for the
  dev-toolchain follow-up
- 7 moderate transitive advisories (via next / postcss / uuid) — no fix available or
  require major framework bumps; tracked, not blocking
