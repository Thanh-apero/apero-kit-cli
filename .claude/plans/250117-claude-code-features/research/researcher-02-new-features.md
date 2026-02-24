# Claude Code Features Research (2024-2025)
> Features NOT implemented in apero-kit-cli

**Date**: 2026-01-17 | **Status**: Complete

---

## 1. Agent Skills System (Oct 2025)

**What**: Organized folders of instructions, scripts, resources Claude loads dynamically.
**Key Features**:
- Hot reload for skills (no restart needed)
- Forked sub-agent context via `context: fork` in frontmatter
- Skills stored in `~/.claude/skills` or `.claude/skills`

**Gap in apero-kit-cli**: No skill hot-reload, no forked context support.

**Source**: [Anthropic Engineering](https://www.anthropic.com/engineering/building-agents-with-the-claude-agent-sdk)

---

## 2. Plugins System (Oct 2025)

**What**: Custom collections of slash commands, agents, MCP servers, hooks.
**Key Features**:
- Single-command install: `claude plugin install <name>`
- Package and share workflows
- Team standardization of dev setups

**Gap in apero-kit-cli**: No plugin packaging/distribution mechanism.

**Source**: [Claude Plugins](https://www.anthropic.com/news/claude-code-plugins)

---

## 3. Hooks API

**What**: Trigger custom scripts at lifecycle points (pre/post tool use).
**Example**:
```json
{"hooks": {"PostToolUse": [{"matcher": "Write(*.py)", "hooks": [{"type": "command", "command": "black \"$file\""}]}]}}
```

**Gap in apero-kit-cli**: No hooks scaffolding or templates.

**Source**: [awesome-claude-code](https://github.com/hesreallyhim/awesome-claude-code)

---

## 4. MCP Server Integration

**What**: Connect to external tools (GitHub, databases, Playwright).
**Key Features**:
- `claude mcp add <name> <command> [args]`
- MCP timeout config via `MCP_TIMEOUT` env var
- MCP prompts as slash commands

**Gap in apero-kit-cli**: No MCP server config templates.

**Source**: [Claude Code Docs](https://code.claude.com/docs/en/overview)

---

## 5. IDE Extensions (v2.0 - Sep 2025)

**VS Code**: Native extension, diff viewer, selection context, diagnostic sharing.
**JetBrains**: Beta plugin, remote development support.
**Key Commands**: Cmd+Esc (open), `/ide` (connect external terminal).

**Gap in apero-kit-cli**: No IDE config scaffolding.

**Source**: [JetBrains Plugin](https://plugins.jetbrains.com/plugin/27310-claude-code-beta-)

---

## 6. GitHub Actions (Aug 2025)

**What**: claude-code-action for PR/issue automation.
**Key Features**:
- `/install-github-app` setup wizard
- Code review, test gen, changelog automation
- Supports Anthropic API, Bedrock, Vertex, Foundry

**Gap in apero-kit-cli**: No GitHub workflow templates.

**Source**: [claude-code-action](https://github.com/anthropics/claude-code-action)

---

## 7. Enterprise Features

| Feature | Description |
|---------|-------------|
| SSO | SAML 2.0, OIDC, JIT provisioning |
| RBAC | Admin, Primary Owner roles |
| Sandbox | bubblewrap (Linux), seatbelt (macOS) |
| Managed Settings | Org-wide Claude Code config |

**Gap in apero-kit-cli**: No enterprise config templates.

**Source**: [Enterprise Docs](https://code.claude.com/docs/en/third-party-integrations)

---

## 8. Background Agents (Dec 2025)

**What**: Run agents in background with Ctrl+B.
**Features**: Token tracking, async output, dev server management.

**Gap in apero-kit-cli**: No background agent templates.

---

## 9. Session Features

| Feature | Description |
|---------|-------------|
| `/rewind` | Undo code changes via checkpoint |
| `/teleport` | Resume sessions at claude.ai/code |
| `/remote-env` | Configure remote sessions |
| Named sessions | Save/restore conversation state |

**Gap in apero-kit-cli**: No session management scaffolding.

---

## 10. New Slash Commands (v2.0+)

| Command | Purpose |
|---------|---------|
| `/release-notes` | View release notes |
| `/terminal-setup` | Setup Kitty/Alacritty/Zed/Warp |
| `/context` | Monitor MCP server usage |
| `/usage` | Check plan limits |

**Gap in apero-kit-cli**: Missing new command templates.

---

## 11. Claude Agent SDK

**Renamed from**: Claude Code SDK.
**Key Features**:
- Custom tools as Python functions (in-process MCP)
- Subagents for specialized tasks
- Works with Sonnet 4.5, Opus 4.5

**Gap in apero-kit-cli**: No SDK scaffolding/examples.

**Source**: [Agent SDK](https://github.com/anthropics/claude-agent-sdk-python)

---

## 12. LSP Tool (Dec 2025)

**What**: Language Server Protocol for go-to-definition, find references, hover docs.
**Integration**: Built into Claude Code v2.1+.

**Gap in apero-kit-cli**: No LSP config templates.

---

## Priority Recommendations for apero-kit-cli

| Priority | Feature | Effort |
|----------|---------|--------|
| P0 | Hooks templates | Low |
| P0 | MCP server configs | Medium |
| P1 | GitHub Actions workflows | Low |
| P1 | Plugin packaging | High |
| P2 | Enterprise configs | Medium |
| P2 | IDE setup templates | Low |
| P3 | Agent SDK examples | High |

---

## Sources

- [Claude Code Docs](https://code.claude.com/docs/en/overview)
- [GitHub Releases](https://github.com/anthropics/claude-code/releases)
- [CHANGELOG.md](https://github.com/anthropics/claude-code/blob/main/CHANGELOG.md)
- [Claude Plugins](https://www.anthropic.com/news/claude-code-plugins)
- [Agent SDK](https://platform.claude.com/docs/en/agent-sdk/overview)
- [GitHub Action](https://github.com/anthropics/claude-code-action)
- [awesome-claude-code](https://github.com/hesreallyhim/awesome-claude-code)
