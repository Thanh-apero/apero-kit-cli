# Phase 2: Enhanced Init Command

## Context
AK-CLI `ck init` supports global install, fresh reinstall, non-interactive mode, and selective component filtering. Current `ak init` lacks these options.

## Overview
Add 5 new flags to existing `initCommand`. Reuse existing copy/state infrastructure. No new files needed -- extend `init.js`, `ak.js`, `prompts.js`, `paths.js`.

## Requirements
- `--global` flag: install to `~/.claude/` instead of project-local
- `--fresh` flag: remove existing installation before re-init
- `-y, --yes` flag: skip all prompts, use defaults (kit=engineer)
- `--exclude <patterns>` flag: glob patterns to exclude components
- `--only <patterns>` flag: glob patterns to include only matching components

## Related Files
- `bin/ak.js` -- command registration (line 28-35)
- `src/commands/init.js` -- main init logic
- `src/utils/prompts.js` -- interactive prompts
- `src/utils/paths.js` -- getTargetDir, need global path helper

## Architecture

```
ak init [project] --global --fresh -y --exclude "skill:shader,agent:copywriter"

initCommand(projectName, options)
  ├── if options.global → projectDir = globalInstallPath()
  ├── if options.fresh → remove existing targetDir + state
  ├── if options.yes → skip all prompts, defaults: kit=engineer, target=claude
  ├── filterComponents(toInstall, options.exclude, options.only)
  └── ... existing copy logic
```

## Implementation Steps

### Step 1: Add global path helper
**File:** `src/utils/paths.js`
```js
export function getGlobalInstallPath() {
  const platform = process.platform;
  if (platform === 'darwin' || platform === 'linux') {
    return join(homedir(), '.claude');
  }
  // Windows: %APPDATA%\claude
  return join(process.env.APPDATA || join(homedir(), 'AppData', 'Roaming'), 'claude');
}
```

### Step 2: Register new options
**File:** `bin/ak.js` -- add to init command definition:
```js
.option('-g, --global', 'Install to global ~/.claude/ directory')
.option('--fresh', 'Remove existing installation before re-init')
.option('-y, --yes', 'Skip prompts, use defaults')
.option('--exclude <patterns>', 'Exclude components (comma-separated)')
.option('--only <patterns>', 'Include only matching components (comma-separated)')
```

### Step 3: Implement --global in initCommand
**File:** `src/commands/init.js`
- At top of function, if `options.global`:
  - Set `projectDir = getGlobalInstallPath()`
  - Set `isCurrentDir = true` (no cd instructions)
  - Log: "Installing globally to ~/.claude/"

### Step 4: Implement --fresh
- After resolving projectDir, if `options.fresh` and targetDir exists:
  - Remove targetDir recursively
  - Remove `.ak/state.json`
  - Log: "Fresh install: removed existing files"

### Step 5: Implement -y/--yes
- If `options.yes`: skip all prompts, set `kitName = 'engineer'`, `target = 'claude'`
- Bypass `promptConfirm`, `promptKit`, `promptExistingTarget`

### Step 6: Implement --exclude and --only
Add filter function:
```js
function filterComponents(list, exclude, only) {
  if (!list || list === 'all') return list;
  let filtered = [...list];
  if (only) {
    const patterns = only.split(',').map(s => s.trim());
    filtered = filtered.filter(item => patterns.some(p => item.includes(p)));
  }
  if (exclude) {
    const patterns = exclude.split(',').map(s => s.trim());
    filtered = filtered.filter(item => !patterns.some(p => item.includes(p)));
  }
  return filtered;
}
```
Apply to `toInstall.agents`, `.skills`, `.commands`, `.workflows` before copy step.

## Todo List
- [ ] Add `getGlobalInstallPath()` to paths.js
- [ ] Register 5 new options in bin/ak.js
- [ ] Implement --global path resolution in init.js
- [ ] Implement --fresh cleanup logic
- [ ] Implement -y/--yes non-interactive mode
- [ ] Implement --exclude/--only component filtering
- [ ] Test: `ak init --global -y`
- [ ] Test: `ak init . --fresh --kit engineer`
- [ ] Test: `ak init . --exclude "skill:shader"`

## Success Criteria
- `ak init --global -y` installs engineer kit to ~/.claude/ with zero prompts
- `ak init . --fresh` removes and reinstalls cleanly
- `--exclude` and `--only` correctly filter component lists

## Risk Assessment
- **--fresh is destructive**: Require confirmation unless `-y` is also set. Add safety check: only delete known AK-managed directories, never arbitrary paths.
- **--global on Windows**: Test APPDATA fallback. Low risk since Claude Code primarily runs on macOS/Linux.

## Security Considerations
- --fresh must only delete `.claude/`, `.opencode/`, `.agent/`, `.ak/` -- never parent directories
- Validate global path is under user home directory
