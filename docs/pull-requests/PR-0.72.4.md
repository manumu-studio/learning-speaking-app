# PR — v0.72.4: Dev Toolchain Security Hardening

**Version:** 0.72.4
**Branch:** chore/dev-toolchain-hardening-audit
**Date:** 2026-06-12
**Type:** Security / Toolchain

## Summary

Three security gaps in the development toolchain are closed:

1. **Test DOM environment CVEs resolved** — happy-dom upgraded from 17.6.1 to 20.10.2,
   eliminating three CVEs including a remote code execution advisory.
2. **Full-tree critical vulnerability gate** — CI now audits all dependencies (not just
   production) at the critical severity threshold on every push and PR.
3. **Secret scanning** — gitleaks runs on every CI run, scanning the full git history for
   accidentally committed credentials.

## What Was Built

### happy-dom 17.6.1 → 20.10.2

Package updated (pinned to exact `20.10.2`) and test suite verified. happy-dom 20 ships
stricter DOM spec compliance than v17; the full suite passed unchanged, so no component
tests or source files needed updating.

After upgrade: `npm audit --audit-level=critical` exits 0.

### CI: full-tree critical audit

New step added to the `lint-typecheck` job, immediately after the existing
`npm audit --audit-level=high --omit=dev` step:

```
npm audit --audit-level=critical
```

This runs on the full dependency tree. devDependency criticals now block the pipeline.

### CI: gitleaks secret scan

New parallel `secret-scan` job added. Runs `gitleaks/gitleaks-action@v2` with a full
history checkout (`fetch-depth: 0`). Runs in parallel with other jobs — does not add
to the critical path.

### Pinned type-check

CI and the lint-staged pre-commit hook now call `npm run typecheck` instead of a bare
`npx tsc`, pinning the local compiler and `tsconfig.build.json` (behavior-preserving).

## Architecture Notes

- Two separate audit steps (prod-only at `high`, full-tree at `critical`) rather than
  one combined command — separate CI log entries make failure triage faster.
- Gitleaks as a standalone job rather than a step in `lint-typecheck` — cleaner failure
  signal in the CI summary.

## How to Validate

1. Run `npm audit --audit-level=critical` locally — should exit 0.
2. Run `npm test -- --run` — all tests green.
3. Open a PR against main and confirm the CI `secret-scan` job appears and passes.
4. Confirm the `lint-typecheck` job log shows two separate audit steps.

## Deployment Notes

No production code changed. This PR only affects devDependencies and CI configuration.
No migration, no environment variable changes, no deploy-side validation needed.
