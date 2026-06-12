# PR-0.72.0 — Dependency Security: Safe Batch

**Branch:** fix/dependency-security-audit → main
**Version:** 0.71.0 → 0.72.0
**Date:** 2026-06-12
**Type:** Security / Maintenance

## Summary

Closes all **critical and high** vulnerabilities in production dependencies and patches the
critical CVEs in the test runner. Two classes are intentionally out of scope and tracked for
a follow-up: the happy-dom test-environment CVEs (a three-major upgrade needing its own
validation) and 7 moderate transitive advisories (via next / postcss / uuid) that have no
fix or require major framework bumps.

## What Was Built

### Dependency updates
- vitest + @vitest/coverage-v8: 3.2.4 → 3.2.6 (critical CVE patch in esbuild chain, non-breaking)

### xlsx removal
The xlsx package was removed from `dependencies`. It had 2 critical CVEs with no upstream
fix. It was only called in `scripts/seed-corpus.ts` inside `seedAcl()` — a one-time corpus
seeding function. The corpus tables are fully seeded in production. The function now
soft-skips with a console warning if xlsx is not installed, and includes instructions for
re-seeding a fresh database if ever needed.

## How to Validate

1. `npm audit --audit-level=high --omit=dev` — should exit 0 (no high/critical in prod deps)
2. `npm test -- --run` — all tests pass
3. `npm run build` — clean build, xlsx no longer in bundle
4. Check `scripts/seed-corpus.ts` seedAcl function — should soft-skip with a warning
   when run without xlsx installed

## Deployment Notes

No database migrations. No environment variable changes. No app behavior changes.
Standard merge-to-main deploy.

## Follow-up (separate PR)

A dev-toolchain hardening pass will upgrade happy-dom (17 → 20) and add a full-tree
`npm audit --audit-level=critical` CI gate plus secret scanning. Those are deferred here
because the happy-dom major upgrade needs independent test-suite validation, and the
critical CI gate can only pass once happy-dom is clean.
