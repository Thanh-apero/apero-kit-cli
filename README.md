# Apero Kit CLI

> Scaffold AI agent projects with pre-configured kits for Claude Code, OpenCode, and Codex.

[![npm version](https://badge.fury.io/js/apero-kit-cli.svg)](https://www.npmjs.com/package/apero-kit-cli)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Installation

```bash
npm install -g apero-kit-cli
```

## Quick Start

```bash
# Initialize a new project with the engineer kit
ak init my-app --kit engineer

# Or use interactive mode
ak init my-app
```

## Commands

### `ak init [project-name]`

Initialize a new project with an agent kit.

```bash
ak init my-app --kit engineer      # Full-stack development kit
ak init my-app --kit researcher    # Research and analysis kit
ak init my-app --kit designer      # UI/UX design kit
ak init my-app --kit minimal       # Lightweight essential kit
ak init my-app --kit full          # Everything included
ak init my-app                     # Interactive mode
```

**Options:**
| Flag | Description |
|------|-------------|
| `-k, --kit <type>` | Kit type: engineer, researcher, designer, minimal, full, custom |
| `-t, --target <target>` | Target folder: claude (default), opencode, generic |
| `-s, --source <path>` | Custom source path for templates |
| `-f, --force` | Overwrite existing directory |

### `ak add <type>:<name>`

Add an agent, skill, or command to an existing project.

```bash
ak add skill:databases         # Add databases skill
ak add agent:debugger          # Add debugger agent
ak add command:fix/ci          # Add fix/ci command
```

### `ak list [type]`

List available kits, agents, skills, or commands.

```bash
ak list              # Show available list commands
ak list kits         # List all kits
ak list agents       # List available agents
ak list skills       # List available skills
ak list commands     # List available commands
```

### `ak update`

Update/sync from source templates. Only updates unchanged files (safe by default).

```bash
ak update                      # Update from configured source
ak update --source ~/AGENTS.md # Update from specific source
ak update --skills             # Update only skills
ak update --dry-run            # Preview what would be updated
ak update --force              # Update without confirmation
```

**Options:**
| Flag | Description |
|------|-------------|
| `-s, --source <path>` | Source path to sync from |
| `--agents` | Update only agents |
| `--skills` | Update only skills |
| `--commands` | Update only commands |
| `-n, --dry-run` | Show what would be updated without making changes |
| `-f, --force` | Force update without confirmation |

### `ak status`

Show project status and file changes.

```bash
ak status            # Show status summary
ak status --verbose  # Show all files
```

### `ak doctor`

Check project health and diagnose issues.

```bash
ak doctor
```

## Available Kits

| Kit | Description | Agents | Skills | Commands |
|-----|-------------|--------|--------|----------|
| 🛠️ **engineer** | Full-stack development | 7 | 7 | 17 |
| 🔬 **researcher** | Research and analysis | 6 | 4 | 10 |
| 🎨 **designer** | UI/UX design | 3 | 3 | 5 |
| 📦 **minimal** | Lightweight essentials | 2 | 2 | 3 |
| 🚀 **full** | Everything included | ALL | ALL | ALL |
| 🔧 **custom** | Pick your own | - | - | - |

## How It Works

### Source Detection

The CLI automatically finds your source templates by searching up from the current directory:

```
cwd → parent → git root
```

It looks for:
- `AGENTS.md` file
- `.claude/` directory
- `.opencode/` directory

You can also specify a custom source with `--source`.

### State Tracking

Each project stores its state in `.ak/state.json`:
- What kit was used
- Source location
- Installed components
- File hashes for safe updates

### Safe Updates

When you run `ak update`:
1. Files you haven't modified → **Updated**
2. Files you've modified → **Skipped** (preserves your changes)
3. New files from source → **Added**

## Project Structure

After `ak init my-app --kit engineer`:

```
my-app/
├── .claude/
│   ├── agents/          # AI agent definitions
│   ├── commands/        # Slash commands
│   ├── skills/          # Knowledge packages
│   ├── router/          # Decision logic
│   ├── hooks/           # Automation scripts
│   ├── README.md
│   └── settings.json
├── .ak/
│   └── state.json       # Project state for updates
└── AGENTS.md            # Core ruleset
```

## Examples

### Workflow: Create and Develop

```bash
# 1. Initialize project
ak init my-api --kit engineer
cd my-api

# 2. Start coding with Claude Code
# ... develop features ...

# 3. Check status
ak status

# 4. Add more skills as needed
ak add skill:databases
ak add skill:devops

# 5. Update when source has new content
ak update
```

### Workflow: Team Sharing

```bash
# Team lead: publish CLI with your custom kits
npm publish

# Team members: install and use
npm install -g apero-kit-cli
ak init my-project --kit engineer
```

## Configuration

### Global Config (Optional)

Create `~/.ak-cli.json`:

```json
{
  "defaultSource": "/path/to/your/AGENTS.md",
  "defaultKit": "engineer"
}
```

## Troubleshooting

Run `ak doctor` to diagnose issues:

```bash
$ ak doctor

Apero Kit Doctor

Checking project health...

✓ ak project detected
✓ State file (.ak/state.json) exists
✓ Target directory exists (.claude)
✓ AGENTS.md exists
✓ Source directory accessible
✓ agents/ exists (15 items)
✓ commands/ exists (40 items)
✓ skills/ exists (25 items)

────────────────────────────────────────

✓ All checks passed!
```

## License

MIT License - see [LICENSE](LICENSE) for details.

## Contributing

Contributions are welcome! Please open an issue or submit a pull request.

## Acknowledgments

Built for use with [Claude Code](https://claude.ai/code), [OpenCode](https://opencode.dev), and similar AI coding assistants.
