# ENTRY-83 — Dev Toolchain Security Hardening

**Date:** 2026-06-12
**Type:** Security / Toolchain
**Version:** 0.72.4
**Branch:** chore/dev-toolchain-hardening-audit

## Summary

Closed three security gaps in the development toolchain: resolved critical CVEs in the
test DOM environment, added a full-tree critical vulnerability gate to CI, and added
secret scanning.

## Files Changed

- `package.json` — happy-dom upgraded from 17.6.1 to 20.10.2; lint-staged type-check routed through `npm run typecheck`; version bumped to 0.72.4
- `package-lock.json` — lockfile updated
- `.github/workflows/ci.yml` — full-tree critical audit step, gitleaks job, `npm run typecheck` swap
- `CHANGELOG.md` — [0.72.4] entry
- `docs/journal/ENTRY-83.md` — this file
- `docs/pull-requests/PR-0.72.4.md` — PR documentation

## What Changed and Why

**happy-dom upgrade (17.6.1 → 20.10.2)**

The test DOM environment carried three open CVEs, one of which was a remote code execution
advisory. While these only affect the local development environment and CI runners (not
production), RCE in any part of the build chain is unacceptable — a compromised test
runner can exfiltrate secrets from environment variables during CI.

The jump from v17 to v20 required a dedicated upgrade pass rather than a batch bump
because happy-dom 20.x ships stricter DOM spec compliance (event propagation, attribute
casing, CSS parsing). In practice the full test suite passed unchanged — no component
tests relied on the lenient v17 behavior — but the upgrade was isolated so any breakage
would have been contained to a single, reviewable change. After the upgrade, no critical
advisories remain anywhere in the dependency tree.

**Full-tree critical CI gate**

CI previously ran `npm audit --audit-level=high --omit=dev` — restricting the check to
production dependencies. devDependency criticals (like the happy-dom RCE) were completely
invisible to the pipeline, which is how they went undetected.

A second audit step `npm audit --audit-level=critical` (no `--omit=dev`) now runs on every
push and PR. The critical threshold avoids blocking on moderate devDep issues with no
available fix, while ensuring anything as severe as RCE is caught before merge.

Two separate steps rather than one combined command is intentional: separate entries in
the CI log make it immediately obvious which audit category failed.

**Secret scanning**

No secret scanning existed in CI. Gitleaks now runs as a standalone job on every push
and PR, scanning the full git history (`fetch-depth: 0`). A finding fails the run
immediately — secrets cannot slip through to main undetected.

**Pinned type-check in CI and pre-commit**

Both CI and the lint-staged pre-commit hook previously invoked a bare `npx tsc`, which can
resolve a stale system TypeScript and the default tsconfig — masking real errors. Both now
call `npm run typecheck`, which pins the local compiler and `tsconfig.build.json`.

## Key Decisions

- **Critical threshold (not high) for full-tree audit.** Using `--audit-level=high` on the
  full tree would block on moderate devDep advisories that often have no available fix.
  Critical is the right threshold for a hard-block gate that covers all dependencies.
- **Gitleaks as a parallel job (not a step in lint-typecheck).** Isolating it as its own
  job means a secret-scan failure is immediately distinguishable in the CI summary from
  a lint or type-check failure — clearer signal, faster triage.
- **happy-dom pinned to exact version 20.10.2.** The three-major jump makes an exact pin
  safer than a caret range; the next upgrade should be a deliberate decision, not a silent
  `npm install` side effect.
