# Phase 7: Skills Command

## Context
AK-CLI `ck skills` enables installing/uninstalling skills to other AI agents (cursor, codex). Current CLI only adds skills to the local .claude/ directory via `ak add skill:name`.

## Overview
New command `ak skills` with subcommands for cross-agent skill installation. Skills are copied from CK-Internal to agent-specific directories.

## Requirements
- `ak skills list` -- list available and installed skills
- `ak skills install <name> [--agent cursor|codex|claude]` -- install skill to target agent
- `ak skills uninstall <name> [--agent cursor|codex|claude]` -- remove skill from agent
- `--all` -- apply to all agents
- Support agent config directories:
  - Claude: `.claude/skills/`
  - Cursor: `.cursor/skills/` or `.cursor/rules/`
  - Codex: `.codex/skills/`

## Related Files
- `bin/ak.js` -- register command
- `src/utils/paths.js` -- resolveSource (for fetching skill files)
- `src/utils/copy.js` -- copyItems (reuse for skill copying)
- `src/utils/state.js` -- track installed skills per agent

## Architecture

```
ak skills list
ak skills install databases --agent cursor
ak skills uninstall databases --agent codex

Agent target directories:
  claude  → .claude/skills/
  cursor  → .cursor/rules/  (Cursor uses rules/ for custom instructions)
  codex   → .codex/skills/
```

## Implementation Steps

### Step 1: Define agent skill paths
```js
const AGENT_SKILL_PATHS = {
  claude: '.claude/skills',
  cursor: '.cursor/rules',
  codex: '.codex/skills',
};
```

### Step 2: Create src/commands/skills.js
```js
export async function skillsCommand(action, nameOrOptions, options = {}) {
  // Commander passes: skills <action> [name]
  // Resolve action: list | install | uninstall

  switch(action) {
    case 'list': return listSkills(options);
    case 'install': return installSkill(nameOrOptions, options);
    case 'uninstall': return uninstallSkill(nameOrOptions, options);
    default:
      console.log(chalk.red(`Unknown action: ${action}`));
      console.log(chalk.gray('Usage: ak skills [list|install|uninstall] [name]'));
  }
}
```

### Step 3: Implement listSkills
- Fetch source via resolveSource()
- List files in source `skills/` directory
- Check which are installed in each agent dir
- Display table: skill name | claude | cursor | codex

### Step 4: Implement installSkill
- Resolve source skill file
- Determine target agent(s) (--agent flag or --all)
- Copy skill file to agent directory
- Update .ak/state.json with skill→agent mapping

### Step 5: Implement uninstallSkill
- Find skill in target agent directory
- Remove file
- Update state

### Step 6: Register in bin/ak.js
```js
program
  .command('skills <action> [name]')
  .description('Manage skills across agents (list, install, uninstall)')
  .option('-a, --agent <agent>', 'Target agent (claude, cursor, codex)', 'claude')
  .option('--all', 'Apply to all agents')
  .action(skillsCommand);
```

## Todo List
- [ ] Create src/commands/skills.js
- [ ] Implement list subcommand with agent cross-reference
- [ ] Implement install subcommand with agent targeting
- [ ] Implement uninstall subcommand
- [ ] Register command in bin/ak.js
- [ ] Update state.js to track per-agent skill installations
- [ ] Test: `ak skills list`
- [ ] Test: `ak skills install databases --agent cursor`
- [ ] Test: `ak skills uninstall databases --all`

## Success Criteria
- `ak skills list` shows available skills and install status per agent
- `ak skills install <name> --agent cursor` copies skill to .cursor/rules/
- `ak skills uninstall <name>` removes skill file and updates state
- Works with existing `ak add skill:name` (which targets .claude/)

## Risk Assessment
- **Medium risk**: Writing to other agent directories (.cursor/, .codex/) that may have their own conventions
- Cursor uses `.cursor/rules/` for custom rules -- skill format may need adaptation (markdown wrapper)
- Codex directory structure not well-documented -- may need research

## Security Considerations
- Only write to known agent directories under project root
- Validate skill names (no path traversal: `../` etc.)
- Never overwrite non-skill files in agent directories
