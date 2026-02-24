# Phase 5: Self-Update Command

## Context
AK-CLI `ck update` self-updates the CLI binary. Current `ak update` only syncs project templates. Need separate command for CLI self-update.

## Overview
New command `ak update-cli` (not `ak update` which is taken) that checks for and installs npm updates to apero-kit-cli itself.

## Requirements
- `ak update-cli` -- update to latest version via npm
- `--check` -- only check, don't install
- `--version <ver>` -- install specific version
- Show current vs latest version comparison

## Related Files
- `bin/ak.js` -- register command
- `package.json` -- current version

## Architecture

```
ak update-cli [--check] [--version 2.0.0]

updateCliCommand(options)
  ├── Get current version from package.json
  ├── Fetch latest from npm registry
  ├── Compare versions
  ├── If --check → display comparison, exit
  ├── If same → "Already up to date"
  └── Run: npm install -g apero-kit-cli@{version}
```

## Implementation Steps

### Step 1: Create src/commands/update-cli.js
```js
import { execSync } from 'child_process';
import chalk from 'chalk';
import ora from 'ora';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

function getCurrentVersion() {
  const pkg = JSON.parse(readFileSync(join(__dirname, '../../package.json'), 'utf-8'));
  return pkg.version;
}

function getLatestVersion() {
  const output = execSync('npm view apero-kit-cli version', {
    encoding: 'utf-8',
    timeout: 15000,
    stdio: ['pipe', 'pipe', 'pipe']
  });
  return output.trim();
}

export async function updateCliCommand(options = {}) {
  const current = getCurrentVersion();
  const spinner = ora('Checking for updates...').start();

  try {
    const latest = options.version || getLatestVersion();
    spinner.stop();

    console.log(`  Current: ${chalk.gray(current)}`);
    console.log(`  Latest:  ${chalk.green(latest)}`);

    if (current === latest && !options.version) {
      console.log(chalk.green('\nAlready up to date!'));
      return;
    }

    if (options.check) {
      console.log(chalk.yellow('\nUpdate available! Run "ak update-cli" to install.'));
      return;
    }

    // Install update
    const target = options.version || 'latest';
    const installSpinner = ora(`Installing apero-kit-cli@${target}...`).start();

    execSync(`npm install -g apero-kit-cli@${target}`, {
      encoding: 'utf-8',
      timeout: 60000,
      stdio: ['pipe', 'pipe', 'pipe']
    });

    installSpinner.succeed(chalk.green(`Updated to ${target}!`));
  } catch (err) {
    spinner.stop();
    console.log(chalk.red('Update failed.'));
    console.log(chalk.gray(err.message));
    console.log(chalk.gray('\nTry manually: npm install -g apero-kit-cli'));
  }
}
```

### Step 2: Register in bin/ak.js
```js
program
  .command('update-cli')
  .description('Update apero-kit-cli to latest version')
  .option('-c, --check', 'Only check for updates')
  .option('--version <ver>', 'Install specific version')
  .action(updateCliCommand);
```

## Todo List
- [ ] Create src/commands/update-cli.js
- [ ] Register command in bin/ak.js
- [ ] Test --check flag
- [ ] Test actual npm update flow
- [ ] Test --version with specific version
- [ ] Handle npm permission errors gracefully

## Success Criteria
- `ak update-cli --check` shows current vs latest without installing
- `ak update-cli` installs latest from npm
- `ak update-cli --version 1.5.0` installs specific version
- Clear error messages when npm fails (permissions, network)

## Risk Assessment
- **Medium risk**: Modifying globally installed package
- npm permissions: Some systems need `sudo`. Detect and suggest: "Permission denied. Try: sudo ak update-cli"
- Package not published yet: Handle 404 from npm registry gracefully
- Bun/pnpm users: Detect package manager via `npm_config_user_agent` or fallback

## Security Considerations
- Only install from official npm registry
- No arbitrary URL installations
