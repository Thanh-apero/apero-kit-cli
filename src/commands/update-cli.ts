import { execSync } from 'child_process';
import pc from 'picocolors';
import ora from 'ora';
import { CLI_ROOT } from '../utils/paths.js';
import { readFileSync } from 'fs';
import { join } from 'path';

function getCurrentVersion(): string {
  try {
    const pkg = JSON.parse(readFileSync(join(CLI_ROOT, 'package.json'), 'utf-8'));
    return pkg.version;
  } catch {
    return '0.0.0';
  }
}

function getLatestVersion(): string {
  const output = execSync('npm view apero-kit-cli version', {
    encoding: 'utf-8',
    timeout: 15000,
    stdio: ['pipe', 'pipe', 'pipe']
  });
  return output.trim();
}

export async function updateCliCommand(options: Record<string, any>): Promise<void> {
  const current = getCurrentVersion();
  const spinner = ora('Checking for updates...').start();

  try {
    const latest = options.version || getLatestVersion();
    spinner.stop();

    console.log(`\n  Current: ${pc.gray(current)}`);
    console.log(`  Latest:  ${pc.green(latest)}`);

    if (current === latest && !options.version) {
      console.log(pc.green('\nAlready up to date!'));
      return;
    }

    if (options.check) {
      console.log(pc.yellow('\nUpdate available! Run "ak update-cli" to install.'));
      return;
    }

    // Install
    const target = options.version || 'latest';
    const installSpinner = ora(`Installing apero-kit-cli@${target}...`).start();

    execSync(`npm install -g apero-kit-cli@${target}`, {
      encoding: 'utf-8',
      timeout: 60000,
      stdio: ['pipe', 'pipe', 'pipe']
    });

    installSpinner.succeed(pc.green(`Updated to ${target}!`));
  } catch (err: any) {
    spinner.stop();
    console.log(pc.red('\nUpdate failed.'));
    console.log(pc.gray(err.message));
    console.log(pc.gray('\nTry manually: npm install -g apero-kit-cli'));
  }
}
