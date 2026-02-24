# Phase 8: Version Display & Update Notification

## Context
AK-CLI shows kit info and update availability on `--version`. Current CLI shows only version number.

## Overview
Enhance `--version` output to show kit info + cached update check. Add 7-day TTL cache to avoid hitting npm on every invocation.

## Requirements
- `ak --version` shows: CLI version, installed kit, data source version
- Check npm for newer CLI version (cached, 7-day TTL)
- Show notification if update available
- Cache stored at `~/.apero-kit/version-check.json`

## Related Files
- `bin/ak.js` -- version display (line 25)
- `src/utils/paths.js` -- CACHE_DIR parent

## Architecture

```
$ ak --version
  apero-kit-cli v1.7.1
  Kit: engineer (via KOHuyn/CK-Internal)

  Update available: 1.8.0 → Run "ak update-cli"
```

## Implementation Steps

### Step 1: Create src/utils/version-check.js
```js
import { join } from 'path';
import { homedir } from 'os';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { execSync } from 'child_process';

const CACHE_FILE = join(homedir(), '.apero-kit', 'version-check.json');
const CACHE_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days

export function getCachedLatestVersion() {
  try {
    if (existsSync(CACHE_FILE)) {
      const cache = JSON.parse(readFileSync(CACHE_FILE, 'utf-8'));
      if (Date.now() - cache.timestamp < CACHE_TTL) {
        return cache.version;
      }
    }
  } catch { /* ignore corrupt cache */ }

  // Fetch fresh
  try {
    const version = execSync('npm view apero-kit-cli version', {
      encoding: 'utf-8',
      timeout: 5000,
      stdio: ['pipe', 'pipe', 'pipe']
    }).trim();

    // Save cache
    const dir = join(homedir(), '.apero-kit');
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    writeFileSync(CACHE_FILE, JSON.stringify({ version, timestamp: Date.now() }));

    return version;
  } catch {
    return null; // offline
  }
}

export function isNewerVersion(current, latest) {
  if (!latest) return false;
  const c = current.split('.').map(Number);
  const l = latest.split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    if ((l[i] || 0) > (c[i] || 0)) return true;
    if ((l[i] || 0) < (c[i] || 0)) return false;
  }
  return false;
}
```

### Step 2: Override Commander --version behavior in bin/ak.js
Replace default `.version(VERSION)` with custom handler:
```js
program
  .option('-V, --version', 'Show version and update info')
  .on('option:version', async () => {
    console.log(`  apero-kit-cli v${VERSION}`);

    // Show kit info from nearest .ak/state.json
    try {
      const state = JSON.parse(readFileSync(join(process.cwd(), '.ak', 'state.json'), 'utf-8'));
      console.log(`  Kit: ${state.kit} (${state.target})`);
    } catch { /* not in project */ }

    // Check for updates (cached)
    const latest = getCachedLatestVersion();
    if (latest && isNewerVersion(VERSION, latest)) {
      console.log('');
      console.log(chalk.yellow(`  Update available: ${VERSION} → ${latest}`));
      console.log(chalk.gray('  Run "ak update-cli" to update'));
    }

    process.exit(0);
  });
```

### Step 3: Optional banner notification
In bin/ak.js, after banner display, optionally show update notice (non-blocking, only if cache is warm):
```js
// Quick non-blocking check (only reads cache, no network)
try {
  const cacheFile = join(homedir(), '.apero-kit', 'version-check.json');
  if (existsSync(cacheFile)) {
    const cache = JSON.parse(readFileSync(cacheFile, 'utf-8'));
    if (isNewerVersion(VERSION, cache.version)) {
      console.log(chalk.yellow(`  Update available: v${cache.version} (run "ak update-cli")\n`));
    }
  }
} catch { /* silent */ }
```

## Todo List
- [ ] Create src/utils/version-check.js
- [ ] Implement getCachedLatestVersion with 7-day TTL
- [ ] Implement isNewerVersion comparison
- [ ] Override --version handler in bin/ak.js
- [ ] Add optional banner notification (cache-only, no network)
- [ ] Test: version check caching
- [ ] Test: stale cache refresh
- [ ] Test: offline behavior (no error)

## Success Criteria
- `ak --version` shows version + kit info + update notice
- npm check cached for 7 days (no repeated network calls)
- Offline: version shows without update notice, no errors
- Banner notification only when cache already has data (no startup delay)

## Risk Assessment
- **Low risk**: Read-only npm check, cached aggressively
- Startup delay: Banner check reads file only (no network), so ~0ms impact
- npm view timeout: 5s max, only on `--version` or cache refresh

## Security Considerations
- Cache file contains only version string + timestamp -- no sensitive data
- npm view goes to public registry -- no auth needed
