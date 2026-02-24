# Phase 0: Project Setup & TypeScript Migration

## Context
- Parent plan: [plan.md](../plan.md)
- Dependencies: None (first phase)
- Docs: [AK-CLI reference](../research/researcher-01-ak-cli-reference.md)

## Overview
- **Priority:** P0 — all other phases depend on this
- **Status:** pending
- **Description:** Migrate project from JavaScript to TypeScript. Replace Commander.js with cac, Inquirer.js with @clack/prompts. Set up tsup build pipeline.

## Key Insights
- AK-CLI uses cac + @clack/prompts — proven combo for CLI tools
- tsup provides zero-config TypeScript bundling with tree-shaking
- Existing bin/ak.js becomes thin wrapper pointing to dist/index.js
- Keep existing templates/ directory structure unchanged

## Requirements
1. Install TypeScript, tsup, cac, @clack/prompts, picocolors (replaces chalk)
2. Remove Commander.js, Inquirer.js, chalk (replaced)
3. Configure tsconfig.json, tsup.config.ts
4. Convert src/index.ts entry point using cac
5. Convert all src/utils/*.js → src/utils/*.ts
6. Convert all src/commands/*.js → src/commands/*.ts
7. Convert src/kits/index.js → src/kits/index.ts
8. Update bin/ak.js to load from dist/
9. Update package.json scripts

## Architecture

### New Dependencies
```json
{
  "dependencies": {
    "@clack/prompts": "^0.7.0",
    "cac": "^6.7.14",
    "fs-extra": "^11.2.0",
    "ora": "^8.0.0",
    "picocolors": "^1.1.1"
  },
  "devDependencies": {
    "tsup": "^8.0.0",
    "typescript": "^5.7.0",
    "@types/fs-extra": "^11.0.4",
    "@types/node": "^22.0.0"
  }
}
```

### Removed Dependencies
- `commander` → replaced by `cac`
- `inquirer` → replaced by `@clack/prompts`
- `chalk` → replaced by `picocolors` (zero-dep, faster)

### tsup.config.ts
```ts
import { defineConfig } from 'tsup';
export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  target: 'node18',
  outDir: 'dist',
  clean: true,
  splitting: false,
  sourcemap: true,
});
```

### tsconfig.json
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "templates"]
}
```

### bin/ak.js (updated)
```js
#!/usr/bin/env node
import '../dist/index.js';
```

## Related Code Files
- `bin/ak.js` — entry point (rewrite)
- `src/commands/*.js` — all 7 commands (convert to .ts)
- `src/utils/*.js` — all 5 utils (convert to .ts)
- `src/kits/index.js` — kit definitions (convert to .ts)
- `package.json` — deps, scripts, files field

## Implementation Steps

### Step 1: Install new deps, remove old
```bash
npm install cac @clack/prompts picocolors
npm install -D tsup typescript @types/fs-extra @types/node
npm uninstall commander inquirer chalk
```

### Step 2: Create tsconfig.json and tsup.config.ts
As shown in Architecture section above.

### Step 3: Create src/index.ts (cac entry)
```ts
#!/usr/bin/env node
import cac from 'cac';
import { registerCommands } from './cli/command-registry.js';
const cli = cac('ak');
registerCommands(cli);
cli.help();
cli.version(/* from package.json */);
cli.parse();
```

### Step 4: Create src/cli/command-registry.ts
Register all commands with cac. Each command file exports its handler function.

### Step 5: Convert utilities (src/utils/*.ts)
- `paths.ts` — resolveSource, embedded templates path
- `state.ts` — loadState, saveState, updateState
- `hash.ts` — hashFile, hashDirectory, compareHashes
- `copy.ts` — copyItems, copyAllOfType, etc.
- `prompts.ts` — rewrite using @clack/prompts (select, multiselect, confirm, text)

### Step 6: Convert commands (src/commands/*.ts)
Port each command maintaining same logic, using new prompt/display APIs.

### Step 7: Convert kits (src/kits/index.ts)
Add proper TypeScript types for kit definitions.

### Step 8: Update package.json
```json
{
  "files": ["bin/ak.js", "dist/", "templates/"],
  "scripts": {
    "dev": "tsup --watch",
    "build": "tsup",
    "start": "node bin/ak.js",
    "typecheck": "tsc --noEmit",
    "test": "node --test dist/**/*.test.js"
  }
}
```

### Step 9: Update bin/ak.js
Thin ESM wrapper importing dist/index.js.

### Step 10: Build and verify
```bash
npm run build
node bin/ak.js --help
node bin/ak.js init --help
```

## Todo List
- [ ] Install new dependencies (cac, @clack/prompts, picocolors, tsup, typescript)
- [ ] Remove old dependencies (commander, inquirer, chalk)
- [ ] Create tsconfig.json
- [ ] Create tsup.config.ts
- [ ] Create src/index.ts with cac setup
- [ ] Create src/cli/command-registry.ts
- [ ] Convert src/utils/paths.js → paths.ts
- [ ] Convert src/utils/state.js → state.ts
- [ ] Convert src/utils/hash.js → hash.ts
- [ ] Convert src/utils/copy.js → copy.ts
- [ ] Convert src/utils/prompts.js → prompts.ts (rewrite for @clack)
- [ ] Convert src/commands/init.js → init.ts
- [ ] Convert src/commands/add.js → add.ts
- [ ] Convert src/commands/update.js → update.ts
- [ ] Convert src/commands/list.js → list.ts
- [ ] Convert src/commands/status.js → status.ts
- [ ] Convert src/commands/doctor.js → doctor.ts
- [ ] Convert src/commands/help.js → help.ts
- [ ] Convert src/kits/index.js → index.ts
- [ ] Update bin/ak.js
- [ ] Update package.json (scripts, files, deps)
- [ ] Build and verify all commands work

## Success Criteria
- `npm run build` succeeds without errors
- `npm run typecheck` passes
- `node bin/ak.js --help` shows all commands
- All 7 existing commands work identically to JS version
- No runtime dependency on commander/inquirer/chalk

## Risk Assessment
- **High risk:** Complete rewrite of prompts.js — @clack has different API patterns
- **Medium risk:** cac has subtle differences from Commander.js in option parsing
- **Low risk:** Utility conversions (paths, state, hash, copy) are straightforward

## Security Considerations
- No new attack surfaces — same functionality, different framework
- picocolors is zero-dependency (reduces supply chain risk vs chalk)

## Next Steps
→ Phase 1 (Data Embedding Pipeline)
→ Phase 2 (Core Commands Migration) — can run in parallel with Phase 1
