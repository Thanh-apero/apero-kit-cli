# Research Report: KOHuyn/AK-CLI Reference Analysis
**Date:** 2026-01-29 | **Status:** Complete (repo accessed via GitHub API)

## Overview
KOHuyn/AK-CLI is a TypeScript/Bun CLI (v3.32.0) for bootstrapping ClaudeKit projects from GitHub releases. Uses `cac` framework, domain-driven architecture, `@clack/prompts` UI.

## Commands: AK-CLI vs Current apero-kit-cli

| AK-CLI Command | Current CLI | Gap |
|---|---|---|
| `ck new` | `ak init` | Similar, AK-CLI separates new vs update |
| `ck init` | `ak init`+`ak update` | AK-CLI init = init OR update existing |
| `ck update` | — | **MISSING**: self-update CLI via npm |
| `ck versions` | `ak list` | **Partial**: AK-CLI lists release versions |
| `ck doctor` | `ak doctor` | AK-CLI has --fix, --report, --json, --check-only |
| `ck uninstall` | — | **MISSING**: remove installations |
| `ck skills` | `ak add` | **MISSING**: cross-agent skill install |
| `ck --version` | — | **Partial**: shows kit versions + update check |
| `ck easter-egg` | — | Promotional, low priority |
| — | `ak add` | Present in current |
| — | `ak list` | Present in current |
| — | `ak status` | Present in current |
| — | `ak help` | Present in current |

## AK-CLI Architecture
- **Language:** TypeScript + Bun
- **CLI Framework:** `cac`
- **Prompts:** `@clack/prompts`
- **Data:** GitHub releases (Octokit API) with auth
- **Structure:** Domain-driven: domains/ (api-key, config, error, github, health-checks, help, installation, migration, skills, sync, ui, versioning), services/, shared/, types/
- **Build:** `bun build` → dist/index.js

## Key Missing Features (Priority)

### 1. `ck new` — Enhanced new project
- Offline: `--archive`, `--kit-path`
- Optional packages: `--opencode`, `--gemini`
- Skills deps: `--install-skills`
- Command prefix: `--prefix`
- Non-interactive: `-y/--yes`
- Version selection: `--beta`, `--release`

### 2. `ck init` — Enhanced update
- Global mode: `--global`
- Fresh install: `--fresh`
- Sync: `--sync` (hunk-by-hunk merge)
- Selective: `--only`, `--exclude`
- Dry-run, force overwrite options

### 3. `ck update` — Self-update CLI
- `--check`, `--release`, `--dev`, `--registry`

### 4. `ck versions` — Release versions list
- Filter by kit, limit, include prereleases

### 5. `ck uninstall` — Remove installations
- Scope: --local, --global, --all, --kit, --dry-run
- Preserves user configs

### 6. `ck skills` — Cross-agent skills
- Install/uninstall to claude-code, cursor, codex
- List, sync, global/project-level

### 7. `ck doctor` (enhanced)
- --fix, --report (gist), --check-only, --json, --full

## Data Source Change Required
- **Current:** `https://github.com/Thanhnguyen6702/CK-Internal.git`
- **Target:** `https://github.com/KOHuyn/CK-Internal.git`
- Single line change in `src/utils/paths.js`

## Unresolved Questions
1. Keep JavaScript or migrate to TypeScript?
2. Keep Commander.js or switch to cac?
3. Use GitHub releases API or keep git clone?
4. Which missing commands are highest priority?
5. Should skills support cross-agent install?
