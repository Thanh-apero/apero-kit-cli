# CK-Internal Repository Structure & Data Organization

**Research Date:** 2026-01-29
**Repository:** https://github.com/KOHuyn/CK-Internal
**Purpose:** Template data source for apero-kit-cli init command

---

## 1. Repository Overview

CK-Internal is a **comprehensive boilerplate template** for building professional software projects with Claude Code agents. It serves as the reference implementation and template library for the apero-kit-cli tool.

**Key Role:** Primary remote data source for CLI scaffolding when users run `ak init --kit [engineer|researcher|designer|minimal|full]`.

---

## 2. Repository Structure

### Core Directories

```
CK-Internal/
├── .claude/                    # Claude Code agent configuration
│   ├── agents/                 # Agent definitions (17+ specialized agents)
│   ├── commands/               # Custom Claude Code commands
│   ├── skills/                 # Reusable skill implementations
│   ├── hooks/                  # Lifecycle hooks (notifications, integrations)
│   └── CLAUDE.md              # Global agent development instructions
├── docs/                       # Project documentation
│   ├── project-overview-pdr.md
│   ├── codebase-summary.md
│   ├── code-standards.md
│   └── system-architecture.md
├── plans/                      # Implementation planning framework
│   └── templates/              # Reusable plan templates (3 templates)
├── guide/                      # User guides & documentation
├── external/                   # External resources
├── scripts/                    # Utility scripts
├── tests/                      # Test files
├── CLAUDE.md                   # Main project-specific instructions
├── AGENTS.md                   # Agent coordination guidelines
├── package.json               # Node.js dependencies
└── README.md                   # Comprehensive project guide
```

### Configuration Files

- `.commitlintrc.json` - Commit message linting rules
- `.releaserc.cjs`, `.releaserc.production.json` - Release automation
- `.env.example` - Environment variable template
- `.repomixignore` - Exclude patterns for codebase snapshots

---

## 3. Template Components Available

### 3.1 Plans/Templates Directory (Consumable by CLI)

Located at `/plans/templates/`:

1. **bug-fix-template.md** (1.7KB)
   - Structured template for bug fixing workflows
   - Includes problem analysis, investigation plan, and testing steps

2. **feature-implementation-template.md** (1.8KB)
   - Feature planning framework
   - Covers requirements, architecture, implementation phases

3. **refactor-template.md** (2.3KB)
   - Code refactoring workflow
   - Includes analysis, refactoring strategy, validation

4. **template-usage-guide.md** (2KB)
   - Meta-documentation on how to use templates
   - Best practices for plan creation

### 3.2 Agent Components (.claude/agents/)

README documents existence of 17+ specialized agents:
- **Planner, Researcher, Tester, Code Reviewer, Debugger** (core dev)
- **Docs Manager, Git Manager, Project Manager** (management)
- **UI/UX Designer, Copywriter** (design & content)
- **Scout, Database Admin, Journal Writer** (specialized)

*Note: Actual agent files not directly enumerated in this search, but referenced in README.*

### 3.3 Documented Command Types

From CLAUDE.md project instructions:
- **agents/** - Agent definitions
- **skills/** - Reusable skill modules
- **commands/** - Custom CLI commands (via Claude Code)
- **workflows/** - Multi-step automation patterns
- **hooks/** - Lifecycle event handlers
- **router/** - Request routing logic

---

## 4. Data Organization for CLI Consumption

### 4.1 Kit Definitions

CK-Internal serves as the reference for 5 preset kits:
- **engineer** - Full-featured development environment
- **researcher** - Research-focused agent setup
- **designer** - Design-centric tools & agents
- **minimal** - Lightweight baseline
- **full** - Maximum components + all extras

Each kit specifies which agents, skills, commands, workflows, router, and hooks to include.

### 4.2 Component Mapping Strategy

The repository structure supports component-based composition:
- **agents/** directory → individual agent files (copyable)
- **skills/** directory → skill modules (copyable)
- **commands/** directory → custom commands (copyable)
- **workflows/** directory → automation sequences (copyable)
- **hooks/** → boolean flags (include/exclude)
- **router/** → single file (include/exclude)

### 4.3 Remote URL Fallback Chain (from apero-kit-cli context)

CLI resolves templates in this order:
1. CLI flag: `--source` parameter
2. Remote Git: `https://github.com/KOHuyn/CK-Internal` (default remote)
3. Embedded templates: `templates/` directory in CLI package
4. Parent directory traversal: Auto-detect local sources

---

## 5. Project Configuration & Metadata

### CLAUDE.md (Global Development Instructions)

- Defines agent behavior patterns
- Project architecture guidelines
- Development standards and conventions
- Agent coordination protocols
- Specific workflows for reference implementation

### AGENTS.md (Agent Coordination)

- Agent interaction guidelines
- Sequential chaining patterns
- Parallel execution patterns
- Context management strategies

### package.json

Contains:
- Project dependencies
- Development tooling configuration
- Script definitions for testing/building
- License (MIT)

---

## 6. Integration Points for CLI

### 6.1 File-Based State Management

CK-Internal demonstrates the pattern used by apero-kit-cli:
- `.ak/state.json` tracking structure
- Hash-based file integrity tracking
- Component version management

### 6.2 Template Copying Pattern

Repository structure supports:
- Component-by-component copying
- Merge vs. override strategies
- Selective kit composition
- Safe update tracking via MD5 hashes

### 6.3 Documentation Synchronization

Includes tooling for:
- Auto-generated codebase summaries (repomix)
- Synchronized technical documentation
- API documentation updates
- Codebase analysis patterns

---

## 7. Key Characteristics for CLI Integration

| Aspect | Details |
|--------|---------|
| **Source Format** | Git repository (GitHub) |
| **Component Type** | Markdown files + JavaScript/TypeScript modules |
| **Organization** | Type-based directories (agents/, skills/, etc.) |
| **Metadata** | Embedded in README, CLAUDE.md, AGENTS.md |
| **Extensibility** | Supports custom agent/skill creation |
| **Version Control** | Semantic versioning with changelog |
| **Documentation** | Comprehensive guides + templates |
| **State Tracking** | Hash-based integrity for safe updates |

---

## 8. Data Flow for CLI Init Command

```
User runs: ak init --kit engineer

1. CLI resolves source (default: CK-Internal remote)
2. Fetches repository structure
3. Selects components based on "engineer" kit definition
4. For each component:
   - Copies from CK-Internal/{type}/{component}/
   - Stores original hash in .ak/state.json
5. Creates .ak/state.json with:
   - Kit name (engineer)
   - Installed components + hashes
   - Source reference
6. Local project now mirrors selected CK-Internal components
```

---

## 9. Critical Observations

**Strengths:**
- Well-organized, hierarchical structure
- Comprehensive documentation at repository level
- Clear separation of concerns by component type
- Version control integration (semantic versioning)
- Multiple kit presets support different use cases

**For CLI Updates:**
- Plans/templates directory is small (4 files) - easily consumable
- Agent/skill/command definitions exist but not directly examined here
- Repository follows same architectural patterns as apero-kit-cli
- Uses same `.claude/` directory convention
- Supports both template copying and state tracking patterns

---

## 10. Unresolved Questions

1. What is the exact file structure within `.claude/agents/`, `.claude/skills/`, etc.? (Requires directory listing per type)
2. How are kit definitions currently stored/versioned? (Not found in root, likely in config or package.json extensions)
3. Are there any authentication requirements for fetching private template components?
4. What versioning strategy is used for individual components vs. overall repository?
5. Are there template metadata files (JSON/YAML) that describe component attributes and dependencies?

---

**Report Generated:** 2026-01-29 at 21:50 UTC
**Status:** Complete - Data collection concluded with identified gaps
