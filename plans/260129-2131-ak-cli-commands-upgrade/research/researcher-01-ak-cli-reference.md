# AK-CLI Research Report
**Date:** 2026-01-29 | **Version:** 1.7.1 | **Repository:** github.com/KOHuyn/AK-CLI

## Executive Summary
Apero Kit CLI (ak) is a Node.js-based CLI tool for scaffolding AI agent projects with pre-configured kits. It provides a template management system for Claude Code, OpenCode, and Codex integrations with safe update mechanisms.

## Command Set Overview

### Core Commands (7 total)

| Command | Purpose | Options |
|---------|---------|---------|
| **init** | Initialize new project with kit | `-k/--kit`, `-t/--target`, `-s/--source`, `-f/--force` |
| **add** | Add skill/agent/command | `-s/--source`, `-p/--path` |
| **list** | Enumerate available components | type filter (kits/agents/skills/commands) |
| **update** | Sync templates from source | `--agents/--skills/--commands`, `--dry-run`, `-f/--force`, `-s/--source` |
| **status** | Show project status | `-v/--verbose` |
| **doctor** | Health check & diagnostics | (none) |
| **help** | Interactive documentation | `-s/--source` |
| **kits** | Alias for `list kits` | (alias) |

## Kits Available

| Kit | Target Use | Components |
|-----|-----------|-----------|
| engineer | Full-stack development | 7 agents, 7 skills, 17 commands |
| researcher | Research/analysis | 6 agents, 4 skills, 10 commands |
| designer | UI/UX design | 3 agents, 3 skills, 5 commands |
| minimal | Lightweight essentials | 2 agents, 2 skills, 3 commands |
| full | Everything included | ALL agents, skills, commands |
| custom | User-selected components | Variable |

## Architecture & Project Structure

**Entry Point:** `bin/ak.js` (#!/usr/bin/env node)
**Framework:** Commander.js v12.1.0 (CLI argument parsing)
**UI:** Chalk v5.3.0 (colored output), Ora v8.0.1 (spinners), Inquirer v9.2.15 (prompts)
**File System:** fs-extra v11.2.0 (enhanced FS operations)

**Project Layout After Init:**
```
.claude/
├── agents/              # AI agent definitions
├── commands/            # Slash commands (/fix, /plan, etc)
├── skills/              # Knowledge/capability packages
├── router/              # Decision routing logic
├── hooks/               # Automation scripts
├── settings.json        # Configuration
└── README.md

.ak/
└── state.json          # Project metadata (kit used, source path, file hashes, components)

AGENTS.md               # Core ruleset (prompt system)
```

## Key Implementation Details

### State Management
- `.ak/state.json` tracks installed components & file hashes (MD5)
- Enables safe updates: modified files skipped, unmodified files updated, new files added
- Source detection: searches cwd → parent → git root for AGENTS.md or .claude/.opencode dirs

### Target Folders
- **claude** (default): `.claude/` directory
- **opencode**: `.opencode/` directory
- **generic**: `.agents/` directory

### Command Files (src/commands/)
- `init.js` (249L): Project initialization with interactive prompts
- `add.js` (144L): Add single components to existing project
- `list.js` (157L): List/enumerate templates
- `update.js` (217L): Sync from source with conflict detection
- `status.js` (155L): Show project status
- `doctor.js` (148L): Health checks
- `help.js` (1432L): Interactive browser-based documentation

## Dependencies & Tech Stack

| Package | Version | Purpose |
|---------|---------|---------|
| chalk | 5.3.0 | Terminal color output |
| commander | 12.1.0 | CLI framework |
| fs-extra | 11.2.0 | Enhanced file operations |
| inquirer | 9.2.15 | Interactive prompts |
| ora | 8.0.1 | Loading spinners |

**Node Version:** >=18.0.0
**Module Type:** ES modules (package.json: "type": "module")
**Bin:** ak, apero-kit

## Template Source System

Sources can be:
1. **AGENTS.md file** - Markdown document with structured component definitions
2. **.claude/** - Directory with agents/, skills/, commands/ subdirectories
3. **.opencode/** - Same structure as .claude/

Source resolution order (automatic):
1. Current working directory
2. Parent directories (walk up)
3. Git repository root

Override with: `--source <path>` flag

## Workflows Enabled

1. **Scaffold Phase:** `ak init my-app --kit engineer` → Project with predefined agents/skills
2. **Development:** Modify components in .claude/ directory
3. **Extension:** `ak add skill:databases` → Inject new components
4. **Maintenance:** `ak status` → Monitor changes, `ak doctor` → Diagnose issues
5. **Sync:** `ak update --dry-run` → Preview, then `ak update` → Sync with source
6. **Documentation:** `ak help` → Launch interactive browser guide

## Export API

Published exports from `src/index.js`:
- `initCommand, addCommand, listCommand, updateCommand, statusCommand, doctorCommand`
- `KITS, getKit, getKitNames, getKitList`

Enables library usage: `import { initCommand } from 'apero-kit-cli'`

## File Organization

```
apero-kit-cli/
├── bin/ak.js                    # Entry point & command registration
├── src/
│   ├── index.js                 # Exports
│   ├── commands/                # 7 command implementations
│   ├── utils/
│   │   ├── paths.js            # Source/target resolution
│   │   ├── copy.js             # File copying logic
│   │   ├── state.js            # State file management
│   │   └── prompts.js          # Interactive prompts
│   └── kits/                    # Kit definitions
├── templates/                   # Template library (not explored)
├── package.json                 # v1.7.1, MIT license
└── README.md
```

## Key Behaviors

- **Safe By Default:** Update skips modified files, preserves user changes
- **Interactive Mode:** Commands prompt for missing args (init, add, custom kit)
- **Source Flexibility:** Support both file-based (AGENTS.md) and directory-based sources
- **Hash-Based Tracking:** MD5 hashes detect user modifications
- **Bilingual Help:** Recent upgrade added VI/EN support
- **Browser UI:** Help command opens interactive documentation in browser

## Known Limitations / Questions

1. Template content structure not examined (templates/ directory)
2. Kits definition mechanism (how engineer/researcher kits are defined)
3. Maximum scalability limits for large component libraries
4. Conflict resolution strategy when sources diverge
5. Performance characteristics with thousands of components
6. Global config file (~/.ak-cli.json) support level
