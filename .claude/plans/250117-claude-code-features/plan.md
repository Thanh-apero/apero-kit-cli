---
title: "Claude Code Features Implementation for apero-kit-cli"
description: "Add missing Claude Code features: hooks scaffolding, MCP configs, GitHub Actions, plugins, enterprise configs, IDE setup, and Agent SDK examples"
status: pending
priority: P0
effort: 16h
branch: main
tags: [claude-code, hooks, mcp, plugins, enterprise, ide, sdk]
created: 2026-01-17
---

# Claude Code Features Implementation Plan

## Executive Summary

Extend apero-kit-cli with 7 missing Claude Code feature categories identified through research. Current state: 194 features (93 commands, 59 skills, 17 agents, 15 hooks, 10 scripts). This plan adds templates and scaffolding for hooks, MCP servers, GitHub Actions, plugins, enterprise configs, IDE setup, and Agent SDK.

---

## Current State Analysis

| Category | Count | Key Pattern |
|----------|-------|-------------|
| Commands | 93 | `/category/variant` in `templates/commands/` |
| Skills | 59 | `SKILL.md` + `references/` in `templates/skills/` |
| Agents | 17 | Role-based `.md` files in `templates/agents/` |
| Hooks | 15 | Event-driven `.cjs` in `templates/hooks/` |
| Scripts | 10 | Python + Node.js in `templates/scripts/` |

**Existing patterns to follow:**
- `ak add <type>:<name>` for installing individual items
- `ak init --kit <name>` for preset bundles
- Templates stored in `templates/` directory
- State tracking via `.ak-state.json`

---

## Gap Analysis Summary

| Priority | Gap | Current State | Target State |
|----------|-----|---------------|--------------|
| **P0** | Hooks templates | 15 hooks, no scaffolding | Hook generator + 8 templates |
| **P0** | MCP server configs | mcp-builder skill only | 12 MCP config templates |
| **P1** | GitHub Actions | No CI/CD templates | 6 workflow templates |
| **P1** | Plugin packaging | No plugin mechanism | Plugin manifest + 4 examples |
| **P2** | Enterprise configs | No SSO/RBAC templates | 5 enterprise templates |
| **P2** | IDE setup | No IDE configs | VS Code + JetBrains configs |
| **P3** | Agent SDK examples | No SDK scaffolding | 4 SDK project templates |

---

## Implementation Phases

### Phase 1: P0 - Hooks Templates + MCP Configs (4h)
**Status:** pending
**File:** [phase-01-p0-hooks-mcp.md](./phase-01-p0-hooks-mcp.md)

**Deliverables:**
- Hook generator command: `ak add hook:<name>`
- 8 hook templates (lifecycle events)
- MCP config generator: `ak add mcp:<name>`
- 12 MCP server config templates

### Phase 2: P1 - GitHub Actions + Plugin System (5h)
**Status:** pending
**File:** [phase-02-p1-github-plugins.md](./phase-02-p1-github-plugins.md)

**Deliverables:**
- GitHub Actions workflow templates (6)
- Plugin manifest schema
- Plugin packaging command
- 4 example plugins

### Phase 3: P2 - Enterprise + IDE Configs (4h)
**Status:** pending
**File:** [phase-03-p2-enterprise-ide.md](./phase-03-p2-enterprise-ide.md)

**Deliverables:**
- Enterprise config templates (SSO, RBAC, sandbox)
- VS Code extension config
- JetBrains plugin config
- IDE-specific .claude settings

### Phase 4: P3 - Agent SDK Examples (3h)
**Status:** pending
**File:** [phase-04-p3-agent-sdk.md](./phase-04-p3-agent-sdk.md)

**Deliverables:**
- Python SDK project template
- TypeScript SDK project template
- Subagent examples
- Custom tool examples

---

## Architecture Decisions

### AD-1: Template Location Strategy
**Decision:** Store new templates in existing `templates/` subdirectories.
**Rationale:** Maintains consistency with current structure; leverages existing `ak add` command.

### AD-2: New Template Categories
**Decision:** Add `templates/mcp-configs/`, `templates/github-actions/`, `templates/plugins/`, `templates/enterprise/`, `templates/ide/`, `templates/sdk-examples/`.
**Rationale:** Separates concerns while following existing naming conventions.

### AD-3: Hook as Template Type
**Decision:** Hooks remain in `templates/hooks/` but add scaffold templates with `.template.cjs` suffix.
**Rationale:** Distinguishes runnable hooks from scaffold templates.

### AD-4: Kit Extension
**Decision:** Add new kits: `enterprise`, `cicd`, `sdk-developer`.
**Rationale:** Bundles new features for common use cases.

---

## Success Criteria

| Phase | Metric | Target |
|-------|--------|--------|
| Phase 1 | Hook templates | 8 templates installable |
| Phase 1 | MCP configs | 12 configs for common servers |
| Phase 2 | GitHub Actions | 6 workflow templates |
| Phase 2 | Plugin examples | 4 working plugins |
| Phase 3 | Enterprise configs | 5 templates |
| Phase 3 | IDE configs | VS Code + JetBrains |
| Phase 4 | SDK examples | 4 project templates |

**Overall:** Total features increase from 194 to ~240+

---

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| Breaking existing `ak add` command | High | Add new types without modifying existing logic |
| Hook template conflicts | Medium | Use `.template.cjs` suffix for scaffolds |
| MCP config version drift | Medium | Version-pin configs, add update script |
| Plugin system complexity | Medium | Start simple, iterate based on feedback |

---

## Dependencies

- Claude Code v2.0+ hook system documentation
- MCP protocol specification v1.0
- GitHub Actions claude-code-action repository
- claude-agent-sdk-python repository

---

## Related Files

| File | Purpose |
|------|---------|
| `src/commands/add.js` | Add command implementation |
| `src/kits/index.js` | Kit definitions |
| `templates/settings.json` | Default Claude settings |
| `templates/hooks/` | Existing hook implementations |
| `templates/skills/mcp-builder/` | MCP building skill |
| `templates/skills/claude-code/` | Claude Code documentation skill |

---

## Next Steps

1. Review and approve this plan
2. Begin Phase 1 implementation
3. Test each phase before proceeding
4. Update documentation after each phase
