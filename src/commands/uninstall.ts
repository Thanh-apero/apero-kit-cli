import fs from 'fs-extra';
import { join } from 'path';
import pc from 'picocolors';
import ora from 'ora';
import * as p from '@clack/prompts';
import { getGlobalInstallPath, TARGETS } from '../utils/paths.js';
import { loadState } from '../utils/state.js';

const PRESERVED_FILES = ['CLAUDE.md', 'settings.json', 'AGENTS.md'];
const AK_SUBDIRS = ['agents', 'skills', 'commands', 'workflows', 'hooks', 'router'];

interface UninstallResult {
  removed: string[];
  errors: Array<{ path: string; error: string }>;
}

export async function uninstallCommand(options: Record<string, any>): Promise<void> {
  p.intro(pc.bgCyan(pc.black(' AK Uninstall ')));

  // Determine scope
  const targets: Array<{ type: string; dir: string }> = [];

  if (options.local || (!options.global && !options.local)) {
    targets.push({ type: 'local', dir: process.cwd() });
  }
  if (options.global) {
    targets.push({ type: 'global', dir: getGlobalInstallPath() });
  }

  let totalRemoved = 0;

  for (const target of targets) {
    const count = await uninstallFromDir(target.type, target.dir, options);
    totalRemoved += count;
  }

  if (totalRemoved === 0) {
    p.outro(pc.yellow('No installations found to remove.'));
  } else {
    p.outro(pc.green(`Successfully removed ${totalRemoved} item(s).`));
  }
}

async function uninstallFromDir(
  type: string,
  dir: string,
  options: Record<string, any>
): Promise<number> {
  const spinner = ora(`Scanning ${type} installation at ${pc.dim(dir)}`).start();

  // Load state
  const state = await loadState(dir);

  // Detect which target directories exist
  const existingTargets: Array<{ name: string; path: string }> = [];
  for (const [name, folder] of Object.entries(TARGETS)) {
    const targetPath = join(dir, folder);
    if (fs.existsSync(targetPath)) {
      existingTargets.push({ name, path: targetPath });
    }
  }

  // Check for .ak directory
  const akDir = join(dir, '.ak');
  const hasAkState = fs.existsSync(akDir);

  if (existingTargets.length === 0 && !hasAkState) {
    spinner.warn(pc.yellow(`No AK installation found in ${type}`));
    return 0;
  }

  spinner.succeed(pc.green(`Found AK installation in ${type}`));

  // Build removal list
  const removalList: string[] = [];

  // Add all AK-managed subdirectories inside target directories
  for (const target of existingTargets) {
    for (const subdir of AK_SUBDIRS) {
      const subdirPath = join(target.path, subdir);
      if (fs.existsSync(subdirPath)) {
        removalList.push(subdirPath);
      }
    }
  }

  // Add .ak state directory
  if (hasAkState) {
    removalList.push(akDir);
  }

  if (removalList.length === 0) {
    console.log(pc.yellow(`  No files to remove from ${type}`));
    return 0;
  }

  // Display what will be removed
  console.log(pc.cyan(`\n  Items to remove from ${type}:`));
  for (const path of removalList) {
    const relativePath = path.replace(dir + '/', '');
    console.log(pc.dim(`    • ${relativePath}`));
  }

  if (state) {
    console.log(pc.dim(`\n  Kit: ${state.kit}`));
    console.log(pc.dim(`  Target: ${state.target}`));
  }

  console.log(pc.yellow(`\n  Preserved files: ${PRESERVED_FILES.join(', ')}`));

  // Dry run - just preview
  if (options.dryRun) {
    console.log(pc.yellow(`\n  [DRY RUN] Would remove ${removalList.length} item(s)`));
    return 0;
  }

  // Confirmation prompt (unless --yes)
  if (!options.yes) {
    const confirmed = await p.confirm({
      message: `Remove ${removalList.length} item(s) from ${type}?`,
      initialValue: false
    });

    if (p.isCancel(confirmed) || !confirmed) {
      console.log(pc.dim('  Cancelled.'));
      return 0;
    }
  }

  // Perform removal
  const result = await removeItems(removalList, dir);

  // Display results
  if (result.removed.length > 0) {
    console.log(pc.green(`\n  ✓ Removed ${result.removed.length} item(s) from ${type}`));
    for (const path of result.removed) {
      const relativePath = path.replace(dir + '/', '');
      console.log(pc.dim(`    • ${relativePath}`));
    }
  }

  if (result.errors.length > 0) {
    console.log(pc.red(`\n  ✗ Failed to remove ${result.errors.length} item(s):`));
    for (const error of result.errors) {
      const relativePath = error.path.replace(dir + '/', '');
      console.log(pc.red(`    • ${relativePath}: ${error.error}`));
    }
  }

  return result.removed.length;
}

async function removeItems(paths: string[], baseDir: string): Promise<UninstallResult> {
  const result: UninstallResult = {
    removed: [],
    errors: []
  };

  for (const path of paths) {
    // Security check: ensure path is within baseDir
    if (!path.startsWith(baseDir)) {
      result.errors.push({
        path,
        error: 'Path outside base directory (security check failed)'
      });
      continue;
    }

    // Security check: ensure path contains expected directories
    const isExpectedPath =
      path.includes('/.ak') ||
      AK_SUBDIRS.some(subdir => path.includes(`/${subdir}`));

    if (!isExpectedPath) {
      result.errors.push({
        path,
        error: 'Path is not an expected AK directory (security check failed)'
      });
      continue;
    }

    try {
      await fs.remove(path);
      result.removed.push(path);
    } catch (error) {
      result.errors.push({
        path,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  return result;
}
