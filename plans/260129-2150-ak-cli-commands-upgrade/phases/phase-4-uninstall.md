# Phase 3: Uninstall Command

## Context
AK-CLI has `ck uninstall` to remove ClaudeKit installations. Current CLI has no uninstall capability -- users must manually delete files.

## Overview
New command `ak uninstall` that removes AK-managed files from local project, global install, or both. Preserves user-created configs. Supports dry-run for safety.

## Requirements
- `ak uninstall` -- remove local installation (current dir)
- `--local` -- explicit local scope
- `--global` -- remove global ~/.claude/ installation
- `--all` -- both local and global
- `-y, --yes` -- skip confirmation
- `--dry-run` -- show what would be removed without deleting
- Preserve: CLAUDE.md, settings.json, user-created files not in state

## Related Files
- `bin/ak.js` -- register new command
- `src/utils/state.js` -- loadState to know what was installed
- `src/utils/paths.js` -- getGlobalInstallPath (from Phase 2), TARGETS

## Architecture

```
ak uninstall [--local|--global|--all] [--dry-run] [-y]

uninstallCommand(options)
  ├── Determine scope (local/global/all)
  ├── For each scope:
  │   ├── Load .ak/state.json → get installed components
  │   ├── Build file list from state (only AK-managed files)
  │   ├── If --dry-run → print list and exit
  │   ├── Confirm (unless -y)
  │   ├── Remove files
  │   ├── Remove empty directories
  │   └── Remove .ak/state.json
  └── Summary
```

## Implementation Steps

### Step 1: Create src/commands/uninstall.js
Core logic:
```js
export async function uninstallCommand(options = {}) {
  const scope = options.all ? 'all' : (options.global ? 'global' : 'local');
  const targets = [];

  if (scope === 'local' || scope === 'all') {
    targets.push({ type: 'local', dir: process.cwd() });
  }
  if (scope === 'global' || scope === 'all') {
    targets.push({ type: 'global', dir: getGlobalInstallPath() });
  }

  for (const target of targets) {
    await uninstallFromDir(target, options);
  }
}
```

### Step 2: Implement uninstallFromDir
- Load state from target dir
- If no state: check if target dirs exist (.claude/, etc.)
- Build removal list: all files tracked in state.installed
- Preserved files list: CLAUDE.md, settings.json (at project root)
- If `--dry-run`: print list, return
- Confirm unless `-y`
- Remove files, then empty dirs bottom-up
- Remove .ak/ directory

### Step 3: Register in bin/ak.js
```js
import { uninstallCommand } from '../src/commands/uninstall.js';

program
  .command('uninstall')
  .description('Remove ClaudeKit installation')
  .option('--local', 'Remove local installation (default)')
  .option('--global', 'Remove global installation')
  .option('--all', 'Remove both local and global')
  .option('-y, --yes', 'Skip confirmation')
  .option('-n, --dry-run', 'Show what would be removed')
  .action(uninstallCommand);
```

### Step 4: Safe deletion logic
```js
const PRESERVED_FILES = ['CLAUDE.md', 'AGENTS.md', 'settings.json'];

function buildRemovalList(projectDir, state) {
  const files = [];
  const targetDir = join(projectDir, state.target || '.claude');

  // Remove managed subdirectories
  for (const type of ['agents', 'skills', 'commands', 'workflows', 'hooks', 'router']) {
    const dir = join(targetDir, type);
    if (fs.existsSync(dir)) files.push(dir);
  }

  // Remove .ak/ state directory
  const akDir = join(projectDir, '.ak');
  if (fs.existsSync(akDir)) files.push(akDir);

  return files;
}
```

## Todo List
- [ ] Create src/commands/uninstall.js
- [ ] Implement scope detection (local/global/all)
- [ ] Implement file removal with preserved files check
- [ ] Implement --dry-run output
- [ ] Register command in bin/ak.js
- [ ] Test: `ak uninstall --dry-run`
- [ ] Test: `ak uninstall --local -y`
- [ ] Test: `ak uninstall --global`

## Success Criteria
- `ak uninstall --dry-run` lists files without deleting anything
- `ak uninstall` removes .claude/ subdirs + .ak/ but preserves CLAUDE.md
- `ak uninstall --global` removes ~/.claude/ managed files
- Exit code 0 on success, 1 on error

## Risk Assessment
- **High risk**: Destructive operation. Mitigations:
  - Default to --dry-run display before confirmation
  - Only delete files tracked in state or known AK directories
  - Never delete files outside project dir or global dir
  - Preserved files list prevents accidental config loss
- **No state file**: If .ak/state.json missing, only remove known AK subdirectories (agents/, skills/, commands/, etc.)

## Security Considerations
- Validate paths are under expected directories before deletion
- No recursive delete of arbitrary paths -- enumerate specific files/dirs
- Log all deletions for audit trail
