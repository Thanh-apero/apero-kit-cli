# Phase 4: Versions Command

## Context
AK-CLI `ck versions` lists available release versions. Current CLI has no way to show what versions of templates are available from the remote source.

## Overview
New command `ak versions` that lists available versions (git tags) from the CK-Internal remote repo. Uses `git ls-remote --tags` -- no full clone needed.

## Requirements
- `ak versions` -- list recent tags from CK-Internal remote
- `--limit <n>` -- limit output (default 10)
- `--all` -- include pre-release tags
- `--kit` -- filter by kit-specific tags (if applicable)

## Related Files
- `bin/ak.js` -- register command
- `src/utils/paths.js` -- REMOTE_REPO_URL constant (need to export or share)

## Architecture

```
ak versions [--limit 10] [--all]

versionsCommand(options)
  ├── git ls-remote --tags REMOTE_REPO_URL
  ├── Parse tag names, sort by semver
  ├── Filter pre-releases unless --all
  ├── Apply --limit
  └── Display formatted list
```

## Implementation Steps

### Step 1: Create src/utils/git-tags.js
```js
import { execSync } from 'child_process';

export function fetchRemoteTags(repoUrl) {
  const output = execSync(`git ls-remote --tags "${repoUrl}"`, {
    encoding: 'utf-8',
    timeout: 15000,
    stdio: ['pipe', 'pipe', 'pipe']
  });

  return output.split('\n')
    .filter(line => line.includes('refs/tags/'))
    .map(line => {
      const tag = line.split('refs/tags/')[1]?.replace('^{}', '');
      return tag;
    })
    .filter(Boolean)
    .filter((v, i, a) => a.indexOf(v) === i); // dedupe
}

export function sortSemver(tags) {
  return tags.sort((a, b) => {
    const pa = a.replace(/^v/, '').split(/[.-]/);
    const pb = b.replace(/^v/, '').split(/[.-]/);
    for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
      const na = parseInt(pa[i]) || 0;
      const nb = parseInt(pb[i]) || 0;
      if (na !== nb) return nb - na; // descending
    }
    return 0;
  });
}
```

### Step 2: Create src/commands/versions.js
```js
export async function versionsCommand(options = {}) {
  const limit = parseInt(options.limit) || 10;
  const spinner = ora('Fetching versions...').start();

  try {
    const tags = fetchRemoteTags(REMOTE_REPO_URL);
    const sorted = sortSemver(tags);

    let filtered = sorted;
    if (!options.all) {
      filtered = sorted.filter(t => !t.includes('-'));
    }

    const display = filtered.slice(0, limit);
    spinner.stop();

    console.log(chalk.cyan.bold('Available versions:\n'));
    display.forEach((tag, i) => {
      const prefix = i === 0 ? chalk.green('  (latest) ') : '           ';
      console.log(`${prefix}${tag}`);
    });

    if (filtered.length > limit) {
      console.log(chalk.gray(`\n  ... ${filtered.length - limit} more (use --all --limit 50)`));
    }
  } catch (err) {
    spinner.fail('Failed to fetch versions');
    console.log(chalk.gray('Check network connection'));
  }
}
```

### Step 3: Export REMOTE_REPO_URL from paths.js
Change from `const` to `export const`:
```js
export const REMOTE_REPO_URL = 'https://github.com/KOHuyn/CK-Internal.git';
```

### Step 4: Register in bin/ak.js
```js
program
  .command('versions')
  .description('List available template versions')
  .option('-l, --limit <n>', 'Number of versions to show', '10')
  .option('-a, --all', 'Include pre-release versions')
  .action(versionsCommand);
```

## Todo List
- [ ] Export REMOTE_REPO_URL from paths.js
- [ ] Create src/utils/git-tags.js
- [ ] Create src/commands/versions.js
- [ ] Register command in bin/ak.js
- [ ] Test with actual KOHuyn/CK-Internal repo
- [ ] Handle no tags gracefully

## Success Criteria
- `ak versions` shows sorted list of tags from remote
- `--all` includes pre-release tags
- `--limit` controls output count
- Graceful failure when offline

## Risk Assessment
- **Low risk**: Read-only git operation, no local changes
- Network timeout: 15s timeout, graceful error message
- No tags in repo: Display "No versions found" message
