# CP-021: Ship PACKET-41 + Permission Cleanup

## Current state
- **Branch:** `feat/l1-bridge-rules` — all changes staged, audit fixes applied, all gates pass (tsc clean, 408 tests, no lint warnings)
- **NOT committed yet** — user needs to run git commit + push + PR

## What's built
- 21 L1 tags (expanded from 12), 8 new detection rules, 21 bridge coaching entries
- PhonemeDetail "How to improve" coaching section
- 16 new tests (9 tagger + 7 lookup)
- Audit fixes: bell/bell minimal pair, vowel_collapse/cup_as_cap co-fire, L1_TAG_LABELS exhaustiveness

## Commit message ready
```
feat(pronunciation): add 21 bridge rules mapping L1 Spanish interference to articulatory coaching

- Expand L1 tagger to 21 tags with 8 new detection rules
- Add static bridge rules database with articulatory coaching per tag
- Show per-word 'How to improve' coaching in PhonemeDetail via client-side lookup
- Fix vowel_collapse/cup_as_cap co-fire, bell/bell minimal pair, L1_TAG_LABELS exhaustiveness
```

## Immediate actions
1. Commit + push + create PR for PACKET-41
2. Run `/plugin uninstall superpowers@superpowers-marketplace` (removes duplicate)
3. Run `/fewer-permission-prompts` to reduce yes/no prompts globally

## Files to read for context
- `docs/build-packet-reports/PACKET-41-l1-bridge-rules-report.md`
- `docs/pull-requests/PR-0.37.0.md`
- `docs/research/CLAUDE-CODE-PLUGIN-ECOSYSTEM-AUDIT-2026-05.md` (§5 action plan for remaining items)
- `~/.claude/settings.json` (updated hooks + plugins)
- `~/.claude/CLAUDE.md` (new Session Protocol + Superpowers tuning)

## Deferred items
- Negative test gaps for 6 new detection rules (minor)
- h_velar detection precision (check topActual)
- getBridgeRules JSDoc for intentional string[] typing
- Snyk MCP install (optional security scanning)
