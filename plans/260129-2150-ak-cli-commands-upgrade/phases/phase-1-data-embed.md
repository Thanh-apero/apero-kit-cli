# Phase 1: Data Embedding Pipeline

## Context
- Parent plan: [plan.md](../plan.md)
- Dependencies: Phase 0 (TS migration)
- Data: [CK-Internal research](../research/researcher-02-ck-internal-data.md)

## Overview
- **Priority:** P1
- **Status:** pending
- **Description:** Create build-time pipeline to clone CK-Internal repo and embed templates in npm package. Eliminates runtime git dependency.

## Key Insights
- Currently: git clone at runtime → cache at ~/.apero-kit/CK-Internal/
- Target: clone at build/publish time → embed in templates/ → ship with npm
- User gets templates instantly, no git required, no network needed for init
- Still support `--source` flag for custom/local overrides
- `ak update` can optionally re-download from npm (new version)

## Requirements
1. Build script clones CK-Internal → templates/ directory
2. templates/ included in npm package via `files` field
3. Remove runtime git clone logic from paths.ts
4. paths.ts resolves source from embedded templates/ first
5. Fallback to --source flag for local overrides
6. npm publish includes templates/ data

## Architecture

### Build Pipeline
```
scripts/fetch-templates.sh (or .js)
  ↓
git clone --depth 1 https://github.com/Thanhnguyen6702/CK-Internal.git /tmp/ck
  ↓
Copy .claude/ contents → templates/
  (agents/, commands/, skills/, workflows/, hooks/, router/, settings.json, AGENTS.md)
  ↓
Remove .git, node_modules, non-template files
  ↓
templates/ ready for bundling
```

### Source Resolution (Simplified)
```ts
// Old: flag → remote git → embedded → parent traversal
// New: flag → embedded templates (always available)
export function resolveSource(sourceFlag?: string): SourceInfo {
  if (sourceFlag) return validateSource(sourceFlag);
  return getEmbeddedTemplates(); // Always available in npm package
}
```

## Related Code Files
- `src/utils/paths.ts` — source resolution (simplify)
- `scripts/fetch-templates.js` — NEW: build-time data fetch
- `package.json` — add prebuild script, files field
- `templates/` — embedded data directory

## Implementation Steps

### Step 1: Create scripts/fetch-templates.js
```js
#!/usr/bin/env node
import { execSync } from 'child_process';
import { cpSync, rmSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

const REPO_URL = 'https://github.com/Thanhnguyen6702/CK-Internal.git';
const TMP_DIR = '/tmp/ck-internal-clone';
const TEMPLATES_DIR = join(process.cwd(), 'templates');
const COMPONENTS = ['agents', 'commands', 'skills', 'workflows', 'hooks', 'router'];

// Clone
if (existsSync(TMP_DIR)) rmSync(TMP_DIR, { recursive: true });
execSync(`git clone --depth 1 ${REPO_URL} ${TMP_DIR}`, { stdio: 'inherit' });

// Clear existing templates
if (existsSync(TEMPLATES_DIR)) rmSync(TEMPLATES_DIR, { recursive: true });
mkdirSync(TEMPLATES_DIR, { recursive: true });

// Copy .claude/ components
const claudeDir = join(TMP_DIR, '.claude');
for (const comp of COMPONENTS) {
  const src = join(claudeDir, comp);
  if (existsSync(src)) cpSync(src, join(TEMPLATES_DIR, comp), { recursive: true });
}

// Copy base files
const baseFiles = ['AGENTS.md', 'settings.json', 'README.md'];
for (const f of baseFiles) {
  const src = join(claudeDir, f);
  if (existsSync(src)) cpSync(src, join(TEMPLATES_DIR, f));
}

// Cleanup
rmSync(TMP_DIR, { recursive: true });
console.log('Templates fetched successfully');
```

### Step 2: Update package.json
```json
{
  "scripts": {
    "fetch-templates": "node scripts/fetch-templates.js",
    "prebuild": "npm run fetch-templates",
    "build": "tsup"
  },
  "files": ["bin/ak.js", "dist/", "templates/"]
}
```

### Step 3: Simplify src/utils/paths.ts
Remove fetchRemoteTemplates(), findSource() parent traversal.
Keep getEmbeddedTemplates() as primary source.
Keep --source flag for overrides.

### Step 4: Update .gitignore
```
# Don't commit cloned templates (fetched at build time)
# But DO commit existing curated templates
# templates/  ← only ignore if you want build-only
```

Decision: Keep templates/ in git so `npm start` works without build.

### Step 5: Verify
```bash
npm run fetch-templates  # Clone + extract
npm run build            # Build TS
node bin/ak.js init      # Should use embedded templates
```

## Todo List
- [ ] Create scripts/fetch-templates.js
- [ ] Update package.json scripts and files field
- [ ] Simplify src/utils/paths.ts (remove git clone logic)
- [ ] Update .gitignore if needed
- [ ] Test fetch-templates script
- [ ] Test init command uses embedded templates
- [ ] Verify npm pack includes templates/

## Success Criteria
- `npm run fetch-templates` clones and extracts CK-Internal data
- `npm run build` includes templates/ in output
- `ak init` works without git/network using embedded templates
- `--source` flag still works for custom sources
- `npm pack` produces package with templates/ included

## Risk Assessment
- **Low risk:** Simple file copy pipeline
- **Medium risk:** CK-Internal structure changes could break extraction
- **Mitigation:** Validate expected directories exist, warn on missing

## Security Considerations
- Build script runs git clone — ensure URL is hardcoded, not user-supplied
- templates/ may contain executable scripts (hooks/) — review contents

## Next Steps
→ Phase 2 (Core Commands Migration)
