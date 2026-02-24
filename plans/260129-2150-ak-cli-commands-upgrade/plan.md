---
title: "AK-CLI Major Rewrite & Commands Upgrade"
description: "Rewrite apero-kit-cli in TypeScript with cac/clack, embed CK-Internal data, add missing commands"
status: pending
priority: P1
effort: 32h
branch: main
tags: [cli, rewrite, typescript, commands, features]
created: 2026-01-29
---

# AK-CLI Major Rewrite & Commands Upgrade

Rewrite apero-kit-cli to match KOHuyn/AK-CLI architecture. Migrate JS→TS, Commander→cac, Inquirer→@clack/prompts. Embed CK-Internal data in npm package. Add all missing commands.

## Validated Decisions

- **TypeScript** with `tsup + Node.js` (build → dist/)
- **`cac`** CLI framework + **`@clack/prompts`** for interactive UI
- **Embed CK-Internal** in npm package (clone at build time, no runtime git)
- **Data source:** `https://github.com/Thanhnguyen6702/CK-Internal` (current URL kept)
- **Binary name:** `ak` (unchanged)
- **No GitHub auth** needed (data bundled)
- **All 8 feature phases** implemented

## Phases

| # | Phase | Effort | Description |
|---|-------|--------|---|
| 0 | [Project Setup & TS Migration](phases/phase-0-ts-migration.md) | 6h | tsup config, TS setup, convert entry + utils, cac + @clack/prompts |
| 1 | [Data Embedding Pipeline](phases/phase-1-data-embed.md) | 3h | Build script clones CK-Internal → templates/, bundled in npm |
| 2 | [Core Commands Migration](phases/phase-2-core-commands.md) | 5h | Migrate init, add, update, list, status, doctor, help → TS + cac |
| 3 | [Enhanced Init Command](phases/phase-3-enhanced-init.md) | 3h | --global, --fresh, -y, --exclude, --only flags |
| 4 | [Uninstall Command](phases/phase-4-uninstall.md) | 2h | New: ak uninstall --local/--global/--dry-run |
| 5 | [Versions Command](phases/phase-5-versions.md) | 2h | New: ak versions --kit/--limit/--all |
| 6 | [Self-Update Command](phases/phase-6-self-update.md) | 2h | New: ak update-cli --check/--version |
| 7 | [Enhanced Doctor](phases/phase-7-enhanced-doctor.md) | 2.5h | --fix, --report, --json, --check-only |
| 8 | [Skills Command](phases/phase-8-skills.md) | 3h | New: ak skills --name/--agent/--list/--uninstall |
| 9 | [Version Notification](phases/phase-9-version-notification.md) | 1.5h | --version with kit info + update check |
| 10 | [Testing & Polish](phases/phase-10-testing.md) | 2h | Tests, build verification, npm publish prep |

## Dependency Graph

```
Phase 0 (TS migration) ─┬─> Phase 1 (data embed)
                         ├─> Phase 2 (core commands migration)
                         │       └─> Phase 3 (enhanced init) ─> Phase 4 (uninstall)
                         │       └─> Phase 7 (enhanced doctor)
                         ├─> Phase 5 (versions)
                         ├─> Phase 6 (self-update)
                         ├─> Phase 8 (skills) [depends on Phase 3 for global paths]
                         └─> Phase 9 (version notification)
Phase 10 (testing) ── after all phases
```

## New Project Structure (Target)

```
src/
├── index.ts              # CLI entry (cac framework)
├── cli/
│   ├── cli-config.ts     # cac instance setup
│   └── command-registry.ts # Register all commands
├── commands/             # Command handlers
│   ├── init.ts, add.ts, update.ts, list.ts, status.ts
│   ├── doctor.ts, help.ts, uninstall.ts, versions.ts
│   ├── update-cli.ts, skills.ts
├── utils/                # Shared utilities
│   ├── paths.ts, state.ts, hash.ts, copy.ts
│   ├── prompts.ts, version-check.ts, git-tags.ts
├── kits/
│   └── index.ts          # Kit definitions
├── types/                # TypeScript types
templates/                # Embedded CK-Internal data (from build)
dist/                     # Built output (tsup)
bin/ak.js                 # Thin wrapper → dist/index.js
```

## Research Reports

- [researcher-01-ak-cli-reference.md](research/researcher-01-ak-cli-reference.md)
- [researcher-02-ck-internal-data.md](research/researcher-02-ck-internal-data.md)
