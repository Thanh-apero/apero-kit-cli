# Phase 2: Core Commands Migration

## Context
- Parent: [plan.md](../plan.md) | Depends on: Phase 0
- Migrate 7 existing commands from JS/Commander → TS/cac

## Overview
- **Priority:** P1 | **Status:** pending
- Convert init, add, update, list, status, doctor, help from JavaScript to TypeScript using cac command registration + @clack/prompts for interactive UI.

## Requirements
1. All 7 commands migrated to TypeScript
2. cac command registration in cli/command-registry.ts
3. Prompts rewritten with @clack/prompts API
4. All existing functionality preserved
5. Display output uses picocolors instead of chalk

## Related Code Files
- `src/commands/init.js` → `src/commands/init.ts`
- `src/commands/add.js` → `src/commands/add.ts`
- `src/commands/update.js` → `src/commands/update.ts`
- `src/commands/list.js` → `src/commands/list.ts`
- `src/commands/status.js` → `src/commands/status.ts`
- `src/commands/doctor.js` → `src/commands/doctor.ts`
- `src/commands/help.js` → `src/commands/help.ts`
- `src/cli/command-registry.ts` — register all commands

## Implementation Steps

### Step 1: Create cli/command-registry.ts
Register each command with cac: name, description, options, action handler.

### Step 2: Migrate prompts.ts to @clack/prompts
Key API mapping:
- `inquirer.prompt([{type:'list'}])` → `clack.select()`
- `inquirer.prompt([{type:'checkbox'}])` → `clack.multiselect()`
- `inquirer.prompt([{type:'confirm'}])` → `clack.confirm()`
- `inquirer.prompt([{type:'input'}])` → `clack.text()`
- Use `clack.intro()`, `clack.outro()`, `clack.spinner()` for UX

### Step 3: Convert each command
Maintain same logic, update imports. Key changes:
- `chalk.green()` → `pc.green()` (picocolors)
- `ora()` → `clack.spinner()` or keep ora
- Commander options → cac options (mostly identical API)

### Step 4: Build and test each command
```bash
npm run build
node bin/ak.js init --help
node bin/ak.js list
node bin/ak.js doctor
node bin/ak.js status
```

## Todo List
- [ ] Create src/cli/command-registry.ts
- [ ] Migrate src/utils/prompts.ts to @clack/prompts
- [ ] Convert init.ts
- [ ] Convert add.ts
- [ ] Convert update.ts
- [ ] Convert list.ts
- [ ] Convert status.ts
- [ ] Convert doctor.ts
- [ ] Convert help.ts
- [ ] Test all 7 commands

## Success Criteria
- All 7 commands work identically to JS version
- Interactive prompts work with @clack/prompts
- `npm run typecheck` passes
- No runtime errors

## Risk Assessment
- **High:** @clack/prompts API differs significantly from Inquirer.js
- **Medium:** cac option parsing may have edge cases vs Commander.js
- **Low:** Utility functions port straightforwardly

## Next Steps
→ Phase 3 (Enhanced Init) | → Phase 7 (Enhanced Doctor)
