# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Thanh Kit (`tk`) — Node.js CLI tool that scaffolds AI agent projects with pre-configured kits (Claude Code, OpenCode, Codex). Copies template files (agents, skills, commands, workflows, hooks, router) into target directories with safe hash-based update tracking.

## Commands

```bash
npm start              # Run CLI (node bin/ak.js)
npm link               # Install globally for development
npm test               # Run tests (node --test src/**/*.test.js)
node bin/ak.js <cmd>   # Run without global install
```

No build step. No linter configured. ES modules throughout (`"type": "module"`).

## Architecture

**Entry point:** `bin/ak.js` — Registers 7 commands via Commander.js, displays banner, delegates to `src/commands/*.js`.

**Command flow:**
```
bin/ak.js → src/commands/{command}.js → src/utils/*.js → templates/
```

**Commands** (`src/commands/`):
- `init.js` — Scaffold project: resolve source → select kit → copy components → create `.ak/state.json`
- `add.js` — Add single component (`tk add skill:databases`)
- `update.js` — Safe sync from source using MD5 hash comparison (skip locally modified files)
- `list.js` — Display available kits/agents/skills/commands/workflows
- `status.js` — Show project state and file modification status
- `doctor.js` — Health check with 7 diagnostic checks
- `help.js` — Generate and serve bilingual HTML docs in browser

**Utilities** (`src/utils/`):
- `paths.js` — Source resolution chain: CLI flag → remote Git (CK-Internal) → embedded `templates/` → parent directory traversal
- `state.js` — Read/write `.ak/state.json` tracking kit, installed components, and file hashes
- `hash.js` — MD5 hashing for file integrity (enables safe updates)
- `copy.js` — Template copying with merge/override modes
- `prompts.js` — Inquirer.js interactive prompts (kit selection, component multiselect, confirmations)

**Kit definitions** (`src/kits/index.js`): 5 preset kits (engineer, researcher, designer, minimal, full) + custom option. Each kit specifies which agents, skills, commands, workflows, router, and hooks to include.

**Templates** (`templates/`): Embedded template files organized by type (agents/, skills/, commands/, workflows/, hooks/, router/). Also fetched remotely from GitHub CK-Internal repo.

## Key Design Patterns

- **Hash-based safe updates:** Original file hashes stored in `.ak/state.json`. On update, compares original→current→source to skip locally modified files.
- **Source fallback chain:** Remote Git → Embedded templates → Local auto-detect (traverses parent dirs).
- **Component types:** agents, skills, commands, workflows (copyable items) + router, hooks (optional boolean flags).
- **Merge vs Override:** Merge skips existing files; Override replaces all.

## Conventions

- Node.js >= 18, ES modules (`import`/`export`)
- Binaries: `tk` and `thanh-kit` (both point to `bin/ak.js`)
- State file: `.ak/state.json` per project
- Key deps: commander, chalk, inquirer, ora, fs-extra
