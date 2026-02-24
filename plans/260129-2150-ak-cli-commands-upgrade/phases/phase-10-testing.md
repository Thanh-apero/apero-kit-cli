# Phase 10: Testing & Polish

## Context
- Parent: [plan.md](../plan.md) | Depends on: All previous phases

## Overview
- **Priority:** P2 | **Status:** pending
- Final validation: build, typecheck, test all commands, npm publish prep.

## Requirements
1. `npm run build` succeeds
2. `npm run typecheck` passes (zero errors)
3. All 11+ commands work correctly
4. `npm pack` produces valid package with templates/
5. Package installs globally and `ak` works

## Implementation Steps

### Step 1: Build verification
```bash
npm run build
npm run typecheck
```

### Step 2: Smoke test all commands
```bash
node bin/ak.js --help
node bin/ak.js --version
node bin/ak.js init --help
node bin/ak.js add --help
node bin/ak.js update --help
node bin/ak.js list
node bin/ak.js status
node bin/ak.js doctor
node bin/ak.js uninstall --help
node bin/ak.js versions --help
node bin/ak.js update-cli --check
node bin/ak.js skills --list
```

### Step 3: Integration test init flow
```bash
mkdir /tmp/test-ak && cd /tmp/test-ak
node /path/to/bin/ak.js init -y --kit engineer
ls -la .claude/
node /path/to/bin/ak.js status
node /path/to/bin/ak.js doctor
```

### Step 4: npm pack test
```bash
npm pack
# Inspect: templates/, dist/, bin/ included
# Install globally from tarball
npm install -g ./apero-kit-cli-*.tgz
ak --version
ak init -y
```

### Step 5: Update package.json version
Bump to v2.0.0 (major: breaking changes from TS migration + framework switch).

### Step 6: Update README.md if needed

## Todo List
- [ ] Build passes
- [ ] Typecheck passes
- [ ] All commands smoke tested
- [ ] Init flow integration test
- [ ] npm pack produces valid package
- [ ] Global install works
- [ ] Version bumped to 2.0.0

## Success Criteria
- Zero build/type errors
- All commands functional
- npm package installable globally
- `ak` binary works after global install
