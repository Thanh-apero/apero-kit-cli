# AK-CLI (ClaudeKit CLI) - Comprehensive Feature Research Report

**Research Date**: 2026-01-29
**Repository**: https://github.com/KOHuyn/AK-CLI
**Current Version**: 3.32.0
**Build Tool**: Bun + TypeScript

---

## Executive Summary

AK-CLI (apero-kit-cli) is a sophisticated Node.js/Bun CLI tool for bootstrapping and managing ClaudeKit projects. Unlike the simpler apero-kit-cli you're using, this is a production-grade system with 8 commands, advanced features like multi-kit support, skills migration, health diagnostics, and comprehensive authentication handling. It uses private GitHub releases for distribution and includes extensive safety mechanisms for file ownership tracking and conflict resolution.

**Key Differentiator**: This is a **release manager** + **project scaffolder** + **health checker** in one, with sophisticated upgrade/downgrade logic, file ownership tracking, and automatic healing capabilities.

---

## CLI Commands (8 Total)

### 1. `new` - Bootstrap New Project
**Purpose**: Create fresh ClaudeKit project with interactive version selection
**Key Options**:
- `--dir <dir>` - Target directory (default: `.`)
- `--kit <kit>` - Kit type: `engineer`, `marketing`, or comma-separated list (e.g., `engineer,marketing`)
- `-r, --release <version>` - Skip prompts, use specific version (e.g., `latest`, `v1.0.0`)
- `--force` - Overwrite existing files without confirmation
- `--exclude <pattern>` - Glob patterns to exclude (repeatable)
- `--opencode` - Install OpenCode CLI package
- `--gemini` - Install Google Gemini CLI package
- `--install-skills` - Auto-install Python/Node/system dependencies
- `--with-sudo` - Include system packages requiring sudo (Linux: ffmpeg, imagemagick)
- `--prefix` - Move commands to `/ak:` namespace to avoid conflicts
- `--beta` - Show beta/prerelease versions
- `--refresh` - Bypass release cache, fetch fresh versions
- `--docs-dir <name>` - Custom docs folder name (default: `docs`)
- `--plans-dir <name>` - Custom plans folder name (default: `plans`)
- `-y, --yes` - Non-interactive mode with sensible defaults
- `--use-git` - Use git clone instead of GitHub API (SSH/HTTPS)
- `--archive <path>` - Use local archive (zip/tar.gz) instead of downloading
- `--kit-path <path>` - Use local kit directory instead of downloading

**Flow**: Resolves source → Selects kit → Downloads release → Extracts → Transforms paths → Migrates skills → Merges files → Post-install setup

---

### 2. `init` - Initialize/Update Existing Project
**Purpose**: Update existing project or convert to ClaudeKit, with advanced merge capabilities
**Key Options** (superset of `new`):
- All `new` options plus:
- `-g, --global` - Use platform-specific user config (~/.claude on macOS/Linux, %USERPROFILE%\.claude on Windows)
- `--fresh` - Remove .claude directory before download (requires confirmation)
- `--dry-run` - Preview changes without applying (requires `--prefix`)
- `--force-overwrite` - Delete user-modified files (requires `--prefix`)
- `--force-overwrite-settings` - Fully replace settings.json (destroys user customizations)
- `--skip-setup` - Skip interactive configuration wizard
- `--sync` - Interactive hunk-by-hunk merge of config files
- `--only <pattern>` - Include only files matching pattern (repeatable)

**Advanced Features**:
- **File Ownership Tracking**: SHA-256 hashing per file with `ownership` field (`ak`, `user`, `ak-modified`)
- **Smart Conflict Resolution**: Detects user modifications, asks before overwriting
- **Multi-Kit Support**: Can install 2+ kits in same project (sequential phase execution)
- **Process Locking**: Prevents concurrent installations with `withProcessLock("kit-install")`
- **Protected Patterns**: Never copies `.env`, `node_modules/`, `.git/`, Python venvs, etc.
- **User Config Preservation**: `.gitignore`, `CLAUDE.md`, `.repomixignore`, `.mcp.json`, etc.

**Phases** (9 total):
1. Options resolution & validation
2. Handle sync mode (--sync flag)
3. Local installation conflict detection (global mode only)
4. Kit, directory, version selection
5. Download & extract release
6. Path transformations (--prefix handling)
7. Skills migration
8. File merge & manifest tracking
9. Post-installation tasks (optional package install)

---

### 3. `update` - Update CLI Tool
**Purpose**: Update the ClaudeKit CLI itself (NOT the kit content)
**Key Options**:
- `-r, --release <version>` - Update to specific version
- `--check` - Check for updates without installing
- `-y, --yes` - Skip confirmation
- `-d, --dev` - Update to latest dev version
- `--beta` - Alias for `--dev` (deprecated)
- `--registry <url>` - Custom npm registry URL
- `--kit <kit>` - DEPRECATED, use `ck init --kit <kit>`
- `-g, --global` - DEPRECATED, use `ck init --global`

**Features**:
- Version comparison with semver awareness
- Detects prerelease vs stable (`isBetaVersion()` checks for `-beta`, `-alpha`, `-rc`, `-dev`)
- Package manager auto-detection (npm/yarn/pnpm/bun)
- Prompts kit update after CLI update (optional auto-upgrade)
- Shows upgrade vs downgrade messaging
- Automatic verification after install

---

### 4. `versions` - List Available Releases
**Purpose**: Browse available versions of kits across all repositories
**Key Options**:
- `--kit <kit>` - Filter by kit type (`engineer`, `marketing`)
- `--limit <limit>` - Number of releases to show (default: 30)
- `--all` - Include prereleases and drafts

**Output Format**: Tabular display with:
- Version tag (color-coded)
- Release name/title
- Relative time (e.g., "2 weeks ago")
- Asset count & badges (prerelease/draft indicators)

---

### 5. `doctor` - Health Check & Diagnostics
**Purpose**: Comprehensive system health check with auto-healing capabilities
**Key Options**:
- `--report` - Generate shareable diagnostic report (uploads to Gist)
- `--fix` - Auto-fix all fixable issues
- `--check-only` - CI mode (no prompts, exit code 1 on failures)
- `--json` - Machine-readable JSON output
- `--full` - Include extended priority checks (slower)

**Registered Checkers** (5 checkers):
1. **SystemChecker**: Node.js, npm, Python, pip, Claude CLI, git, gh CLI
2. **ClaudekitChecker**: Global/project installation, versions, skills
3. **AuthChecker**: GitHub CLI authentication, repository access
4. **PlatformChecker**: OS-specific checks
5. **NetworkChecker**: Internet connectivity tests

**Auto-Fix Capabilities**:
| Issue | Fix Action |
|-------|-----------|
| Missing dependencies | Install via package manager |
| Missing gh auth | Run `gh auth login` |
| Corrupted node_modules | Reinstall dependencies |
| Missing global install | Run `ck init --global` |
| Missing skill dependencies | Install in skill directory |

**Exit Codes**:
- `0`: All checks pass or issues fixed
- `1`: Failures detected (only with `--check-only`)

---

### 6. `uninstall` - Remove ClaudeKit
**Purpose**: Remove ClaudeKit installations with scope selection
**Key Options**:
- `-y, --yes` - Skip confirmation
- `-l, --local` - Uninstall only local installation (`.claude/` in project)
- `-g, --global` - Uninstall only global installation (`~/.claude/`)
- `-A, --all` - Uninstall from both local and global
- `-k, --kit <type>` - Uninstall specific kit only
- `--dry-run` - Preview what would be removed
- `--force-overwrite` - Delete even user-modified files (requires confirmation)

**Removal Scope**: Removes `.claude/` subdirectories (`commands/`, `agents/`, `skills/`, `workflows/`, `hooks/`, `metadata.json`) while preserving `settings.json`, `settings.local.json`, `CLAUDE.md`

---

### 7. `skills` - Install Skills to Other Agents
**Purpose**: Cross-agent skill installation (Claude Code, Cursor, Codex, etc.)
**Key Options**:
- `-n, --name <skill>` - Skill name to install/uninstall
- `-a, --agent <agents...>` - Target agents (repeatable)
- `-g, --global` - Install globally instead of project-level
- `-l, --list` - List available skills
- `--installed` - Show installed skills (use with `--list`)
- `--all` - Install to all supported agents
- `-u, --uninstall` - Uninstall skill(s)
- `--force` - Force uninstall even if not in registry
- `--sync` - Sync registry with filesystem (remove orphans)
- `-y, --yes` - Skip confirmation prompts

**Supported Agents**:
- `claude-code` (Claude Code)
- `cursor`
- `codex`
- (extensible)

---

### 8. `easter-egg` - Code Hunt 2025 Promo
**Purpose**: Roll for random discount code
**Command**: `ck easter-egg`
**Note**: Seasonal/promotional feature

---

## Kit Interface & Configuration

### Kit Type Definition (`KitType`)
```typescript
type KitType = "engineer" | "marketing"
```

### Kit Configuration (`KitConfig`)
```typescript
interface KitConfig {
  name: string              // Display name (e.g., "ClaudeKit Engineer")
  repo: string              // Repository name (e.g., "CK-Internal")
  owner: string             // GitHub owner (e.g., "KOHuyn")
  description: string       // Kit description
}
```

### Available Kits
```
engineer:
  - name: "ClaudeKit Engineer"
  - repo: "CK-Internal"
  - owner: "KOHuyn"
  - description: "Engineering toolkit for building with Claude"

marketing:
  - name: "ClaudeKit Marketing"
  - repo: "claudekit-marketing"
  - owner: "claudekit"
  - description: "Marketing automation toolkit for Claude"
```

### Metadata Structure (Multi-Kit Format)
```typescript
interface MultiKitMetadata {
  // Multi-kit discriminator: kits object indicates multi-kit format
  kits?: Record<KitType, KitMetadata>
  scope?: "local" | "global"
  // Legacy fields (ignored when kits present)
  name?: string
  version?: string
  installedAt?: string
}

interface KitMetadata {
  version: string
  installedAt: string
  files?: TrackedFile[]
  lastUpdateCheck?: string
  dismissedVersion?: string
  installedSettings?: {
    hooks?: string[]
    mcpServers?: string[]
    hookTimestamps?: Record<string, string>
    mcpServerTimestamps?: Record<string, string>
  }
}

interface TrackedFile {
  path: string              // Relative to .claude/
  checksum: string          // SHA-256 hash
  ownership: "ak" | "user" | "ak-modified"
  installedVersion: string
  baseChecksum?: string
  sourceTimestamp?: string  // Git commit timestamp
  installedAt?: string
}
```

---

## Template Components & File Organization

### Typical Kit Structure (Inferred from Init Flow)

**Copied During Init** (subject to protected patterns):

```
.claude/
├── commands/              # Slash commands
│   ├── command1.ts
│   ├── command2.ts
│   └── ...
├── agents/                # Agent definitions
│   ├── agent1.ts
│   └── ...
├── skills/                # Reusable skills (auto-migrated)
│   ├── category1/
│   │   └── skill1/
│   ├── category2/
│   │   └── skill2/
│   └── ...
├── workflows/             # Complex workflows
│   └── workflow1.ts
├── hooks/                 # Git hooks, webhooks
│   └── hook1.sh
├── router/                # Optional routing configuration
├── settings.json          # User settings (preserved)
├── settings.local.json    # Local overrides (preserved)
├── metadata.json          # Installation metadata (auto-generated)
├── CLAUDE.md              # Project documentation (preserved)
├── .repomixignore         # Repomix configuration (preserved)
├── .mcp.json              # MCP server config (preserved)
└── .ckignore              # Custom ignore patterns (preserved)
```

### Protected Patterns (Never Copied)
```
Never Copy (contain secrets):
  - .env, .env.local, .env.*.local
  - *.key, *.pem, *.p12
  - node_modules/**, .git/**, dist/**, build/**
  - .venv/**, venv/**, __pycache__/**

Preserve User Versions (skip if exists):
  - .gitignore
  - .repomixignore
  - .mcp.json
  - .ckignore
  - .ck.json
  - CLAUDE.md
```

### Optional Components
- **Router**: Enabled via kit configuration boolean
- **Hooks**: Enabled via kit configuration boolean
- **OpenCode**: Installable via `--opencode` flag (global only in multi-kit mode)
- **Gemini**: Installable via `--gemini` flag

---

## Command Registry & Entry Point

### Entry Point: `bin/ak.js`
- Suppressez Buffer deprecation warnings
- Graceful shutdown handlers (SIGINT/SIGTERM)
- Async IIFE wrapper (prevents libuv assertion failures on Node 23-25)
- Output encoding setup (UTF-8)
- Custom version display and help interception

### Command Registration (`src/cli/command-registry.ts`)
Uses **CAC** (simple CLI framework) with `cli.command()` API. All 8 commands registered with:
- Command name & description
- Options with types
- Action handlers (async functions)
- Option normalization (arrays for multi-value flags)

---

## Advanced Features & Mechanisms

### 1. Smart File Merging
- **Hash-based tracking**: SHA-256 checksums per file
- **Ownership detection**: Distinguishes `ak` (template), `user` (custom), `ak-modified` (user modified template file)
- **Conflict prompting**: Asks user before overwriting user-modified files
- **Rollback capability**: Stores base checksum for diff detection

### 2. Skills Migration
- **Detection**: Manifest-based + heuristic fallback
- **Structure change support**: Flat → Categorized directory structure
- **Customization preservation**: Hashing detects which skills were modified
- **Atomic operations**: Backup before, rollback on failure
- **Parallel processing**: Processes multiple skills concurrently

### 3. Multi-Kit Installation
- Version strategy matching: Tries same version for additional kits
- Sequential execution: Installs kits one after another
- Shared context: Reuses directory, options from primary kit
- Per-kit regeneration: Clears temp files between kits

### 4. Authentication (Multi-Tier Fallback)
```
1. GitHub CLI (gh auth token)
   ↓ (if not available)
2. Environment Variables (GITHUB_TOKEN)
   ↓ (if not set)
3. Config File (~/.claudekit/config.json)
   ↓ (if not found)
4. OS Keychain (secure storage)
   ↓ (if not stored)
5. User Prompt (with save option)
```

### 5. Release Caching
- **Cache Location**: `~/.claudekit/cache/releases/`
- **TTL**: Configurable via `CK_CACHE_TTL` (default: 3600 seconds)
- **Invalidation**: `--refresh` flag bypasses cache

### 6. Update Notifications
- **Cache**: 7-day cache for version checks
- **Disable**: `NO_UPDATE_NOTIFIER=1` environment variable
- **Auto-upgrade prompt**: After CLI update, prompts to update kit content

### 7. File Ownership Validation
- **Prevents data loss**: Won't overwrite user files without confirmation
- **Tracks modifications**: Detects if user modified template file
- **Ownership states**:
  - `ak`: Original template file, safe to overwrite
  - `user`: User created file, preserve
  - `ak-modified`: Template file user modified, confirm before overwriting

---

## Package.json Analysis

### Key Dependencies
- **CLI**: `cac` (command framework), `@clack/prompts` (interactive prompts), `ora` (spinners)
- **GitHub**: `@octokit/rest` (API client)
- **Compression**: `extract-zip`, `tar` (archive handling)
- **Utilities**: `fs-extra`, `gray-matter` (YAML frontmatter), `ignore` (gitignore patterns)
- **Validation**: `zod` (schema validation)
- **Semver**: `semver`, `compare-versions` (version parsing)
- **Concurrency**: `p-limit` (process limiting)
- **Misc**: `picocolors` (CLI colors), `proper-lockfile`, `tmp` (temporary files)

### Build System
- **Engine**: Bun >= 1.3.2 or Node >= 18.0.0
- **Build**: `bun build src/index.ts --outdir dist --target node`
- **Compile**: `bun build --compile --outfile ak` (standalone binary)
- **Test**: `bun test`

### Scripts
- **dev**: `bun run src/index.ts`
- **build**: TypeScript → JavaScript (dist/)
- **compile:binary**: Standalone executable (`bin/ak`)
- **compile:binaries**: Platform-specific binaries (all OS)
- **lint**: Biome
- **typecheck**: tsc --noEmit
- **test**: bun test

---

## Notable Features vs Your apero-kit-cli

### Features AK-CLI Has (You Should Consider)
1. **Multi-kit support** - Install 2+ kits in one project
2. **File ownership tracking** - SHA-256 hashing per file
3. **Skills auto-migration** - Detects structure changes, preserves customizations
4. **Health diagnostics** - 5 checker modules with auto-healing
5. **Advanced sync** - Hunk-by-hunk merge with diff preview
6. **Release caching** - TTL-based caching for performance
7. **Uninstall command** - Cleanly remove installations
8. **Skills cross-agent** - Install skills to Cursor, Codex, etc.
9. **Offline mode** - `--archive` and `--kit-path` for local installation
10. **Pre/post-install hooks** - Extensible installation pipeline
11. **Process locking** - Prevents concurrent installations
12. **Verbose logging** - Structured logging with optional file output
13. **Platform-specific paths** - Windows, macOS, Linux support

### Features Your apero-kit-cli Has (AK-CLI Lacks)
1. **Simpler codebase** - Easier to understand & maintain
2. **ES modules throughout** - No build step needed
3. **Embedded templates** - No external downloads for fallback
4. **Local source resolution** - Parent directory traversal for templates
5. **Merge vs Override modes** - Flexible file handling strategies

---

## Directory Structure Overview

```
src/
├── cli/
│   ├── cli-config.ts        # CAC instance creation
│   ├── command-registry.ts  # All 8 commands registered
│   └── version-display.ts   # Custom version output
├── commands/
│   ├── doctor.ts            # Doctor command
│   ├── easter-egg.ts        # Promo easter egg
│   ├── init.ts              # Init command wrapper
│   ├── init/
│   │   ├── init-command.ts  # Main orchestrator (9 phases)
│   │   ├── types.ts         # InitContext type
│   │   └── phases/          # Phase handlers
│   ├── new/                 # New command (similar to init)
│   ├── skills/              # Skills command + sub-modules
│   ├── uninstall/           # Uninstall command
│   ├── update-cli.ts        # CLI update command
│   └── version.ts           # Versions listing command
├── domains/                 # Business logic layers
│   ├── api-key/             # Credential management
│   ├── config/              # Config file handling
│   ├── github/              # GitHub API wrapper
│   ├── health-checks/       # Doctor checkers
│   ├── installation/        # Installation logic
│   ├── migration/           # Skills migration
│   ├── sync/                # Config sync with merge
│   └── versioning/          # Version management
├── services/                # Utility services
│   ├── file-operations/     # File I/O
│   ├── package-installer/   # npm/pip/system package install
│   └── transformers/        # Path/file transformations
├── shared/                  # Shared utilities
│   ├── logger.js            # Structured logging
│   ├── output-manager.js    # JSON/text output
│   ├── process-lock.js      # Installation locking
│   └── safe-prompts.js      # Prompt wrappers
├── types/                   # TypeScript schemas
│   ├── commands.ts          # Command option types
│   ├── kit.ts               # Kit configuration
│   ├── metadata.ts          # Metadata schemas
│   └── skills.ts            # Skill types
└── index.ts                 # Main entry point

bin/
└── ak.js                    # Compiled entry point (built from src/index.ts)
```

---

## Critical Differences in Architecture

### Orchestration Pattern
- **Your approach**: Direct command handler execution
- **AK-CLI approach**: Phase-based orchestrator with context passing
  - Each phase receives context, returns modified context
  - Enables atomic rollback and error recovery
  - Complex operations broken into 9 testable phases

### Type Safety
- **Your approach**: Minimal TypeScript
- **AK-CLI approach**: Zod schemas for all public inputs/configs
  - Runtime validation of all options
  - IDE autocomplete for all command options

### File Management
- **Your approach**: Simple MD5 hash comparison
- **AK-CLI approach**: Multi-layer ownership tracking
  - SHA-256 per file
  - Ownership classification (ak/user/ak-modified)
  - Timestamps for conflict resolution
  - Base checksums for diff detection

---

## Configuration & State Management

### State Location
- **Local**: `.claude/metadata.json` (per project)
- **Global**: `~/.claude/metadata.json` (platform-specific path)
- **Config**: `~/.claudekit/config.json` (shared settings)

### Metadata Schema
Multi-kit format with backward compatibility:
```json
{
  "kits": {
    "engineer": {
      "version": "v3.30.0",
      "installedAt": "2026-01-29T10:00:00Z",
      "files": [
        {
          "path": "commands/plan.ts",
          "checksum": "abc123...",
          "ownership": "ak",
          "installedVersion": "v3.30.0"
        }
      ]
    }
  }
}
```

---

## Unresolved Questions

1. **Skills dependency resolution**: How does AK-CLI handle circular skill dependencies or peer dependencies? (Not detailed in code)

2. **Concurrent kit installation**: The process lock prevents ALL concurrent installations. Is there a strategy for installing multiple kits in parallel within same lock?

3. **Config merge algorithm**: The `--sync` flag uses "hunk-by-hunk merge" but the exact diff algorithm and conflict resolution strategy isn't visible in code review.

4. **Custom transformer plugins**: Can users write custom path transformers, or is the transformation logic fixed?

5. **Skills auto-discovery**: How does the system discover new skills categories when migrating? Is there a manifest file or heuristic pattern matching?

6. **Rollback strategy**: On installation failure, does it restore from backup or delete partial install? The atomicity strategy isn't fully documented.

7. **Private kit authentication**: How long are GitHub tokens cached in keychain? Is there token expiration handling?

8. **Multi-version coexistence**: Can a project have multiple versions of the same kit installed? Or is it 1 version per kit per scope?

---

## Summary

AK-CLI is a **production-grade, battle-tested** release management system. It's significantly more sophisticated than your current implementation with:

- 8 commands vs your 7
- Multi-kit support with sequential installation
- Advanced file ownership tracking (SHA-256 + ownership classification)
- Health diagnostics with auto-healing
- Sophisticated conflict resolution with hunk-by-hunk merge
- Skills auto-migration with customization preservation
- Platform-specific installation paths
- Offline installation capability
- Cross-agent skill distribution

**Recommended use of this research**: Study the orchestration pattern (phases + context) and file ownership model (SHA-256 + ownership tracking) as these solve problems your current MD5-hash approach doesn't address.

Generated with [Claude Code](https://claude.com/claude-code)
