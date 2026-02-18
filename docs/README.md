# Learning Speaking App — Build System Guide

## Overview

This project uses a **3-way build cycle** between Claude Code (architect), Cursor (builder), and quality gates (validation).

## Build Cycle

```
CLAUDE → writes specs + reviews
CURSOR → builds code from specs
USER   → validates + commits
```

### Per-Packet Flow

1. Claude writes the build packet + creates feature branch
2. Open packet in Cursor: *"Read .cursorrules, then follow this packet exactly"*
3. Cursor builds all code
4. Run quality gates: `npx tsc --noEmit && npm run build && npm run lint`
5. Pass → commit + merge to main
6. Fail → bring error to Claude → get fix → back to Cursor

## Packet Order (sequential — no skipping)

| # | Packet | Branch | Version |
|---|--------|--------|---------|
| 01 | scaffold | `feature/project-bootstrap` | 0.1.0 |
| 02 | database | `feature/database-schema` | 0.2.0 |
| 03 | auth | `feature/oidc-auth` | 0.3.0 |
| 04 | app-shell | `feature/app-shell` | 0.4.0 |
| 05 | recording-ui | `feature/recording-ui` | 0.5.0 |
| 06 | upload-api | `feature/audio-upload` | 0.6.0 |
| 07 | processing-pipeline | `feature/processing-pipeline` | 0.7.0 |
| 08 | results-ui | `feature/results-ui` | 0.8.0 |
| 09 | history-gdpr | `feature/history-gdpr` | 0.9.0 |
| 10 | polish | `feature/polish-monitoring` | 1.0.0 |

## Documentation Per Feature

Each feature produces:
- **Journal entry**: `docs/journal/ENTRY-N.md` — dev-facing, captures the "why"
- **PR doc**: `docs/pull-requests/PR-X.Y.Z.md` — team-facing, captures what was built

## Quality Gates

After every packet:
```bash
npx tsc --noEmit          # Zero type errors
npm run build             # Clean build
npm run lint              # No lint violations
```

All must pass before committing.

## Key References

- **Architecture**: `docs/architecture/SYSTEM_SPEC.md`
- **Project rules**: `.cursorrules`
- **Security**: `docs/SECURITY.md`
- **Roadmap**: `docs/roadmap/ROADMAP.md`
