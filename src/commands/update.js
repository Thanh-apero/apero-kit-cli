import fs from 'fs-extra';
import { join } from 'path';
import chalk from 'chalk';
import ora from 'ora';
import { resolveSource, isAkProject } from '../utils/paths.js';
import { loadState, updateState, getFileStatuses } from '../utils/state.js';
import { hashFile, hashDirectory } from '../utils/hash.js';
import { promptUpdateConfirm } from '../utils/prompts.js';

export async function updateCommand(options = {}) {
  const projectDir = process.cwd();

  // Check if in ak project
  if (!isAkProject(projectDir)) {
    console.log(chalk.red('Not in an ak project.'));
    console.log(chalk.gray('Run "ak init" first.'));
    return;
  }

  // Load state
  const state = await loadState(projectDir);
  if (!state) {
    console.log(chalk.red('No state file found.'));
    console.log(chalk.gray('This project may have been created without ak. Run "ak doctor" for more info.'));
    return;
  }

  // Resolve source
  const sourceFlag = options.source || state.source;
  const source = resolveSource(sourceFlag);
  if (source.error) {
    console.log(chalk.red(`Error: ${source.error}`));
    return;
  }

  console.log(chalk.gray(`Source: ${source.path}`));
  console.log(chalk.gray(`Target: ${state.target}`));
  console.log('');

  const spinner = ora('Checking for updates...').start();

  try {
    // Get current file statuses
    const { statuses, targetDir } = await getFileStatuses(projectDir);

    // Determine what types to update
    let typesToUpdate = ['agents', 'skills', 'commands', 'workflows'];
    if (options.agents) typesToUpdate = ['agents'];
    if (options.skills) typesToUpdate = ['skills'];
    if (options.commands) typesToUpdate = ['commands'];

    // Get source hashes
    const sourceHashes = {};
    for (const type of typesToUpdate) {
      const typeDir = join(source.claudeDir, type);
      if (fs.existsSync(typeDir)) {
        const hashes = await hashDirectory(typeDir);
        for (const [path, hash] of Object.entries(hashes)) {
          sourceHashes[`${type}/${path}`] = hash;
        }
      }
    }

    // Compare with current
    const toUpdate = [];
    const skipped = [];
    const newFiles = [];

    for (const [path, sourceHash] of Object.entries(sourceHashes)) {
      const currentPath = join(targetDir, path);
      const originalHash = state.originalHashes?.[path];
      const currentHash = fs.existsSync(currentPath) ? hashFile(currentPath) : null;

      if (!currentHash) {
        // New file from source
        newFiles.push(path);
      } else if (currentHash === originalHash) {
        // File unchanged locally, can update
        if (sourceHash !== currentHash) {
          toUpdate.push(path);
        }
      } else {
        // File modified locally, skip
        if (sourceHash !== originalHash) {
          skipped.push(path);
        }
      }
    }

    spinner.stop();

    // Show summary
    if (toUpdate.length === 0 && newFiles.length === 0) {
      console.log(chalk.green('✓ Already up to date!'));
      if (skipped.length > 0) {
        console.log(chalk.yellow(`  ${skipped.length} file(s) skipped (modified locally)`));
      }
      return;
    }

    console.log(chalk.cyan('Updates available:'));
    console.log(chalk.green(`  ${toUpdate.length} file(s) to update`));
    console.log(chalk.blue(`  ${newFiles.length} new file(s)`));
    if (skipped.length > 0) {
      console.log(chalk.yellow(`  ${skipped.length} file(s) skipped (modified locally)`));
    }
    console.log('');

    // Dry run mode
    if (options.dryRun) {
      console.log(chalk.cyan('Dry run - no changes made'));
      console.log(chalk.gray('\nFiles that would be updated:'));
      [...toUpdate, ...newFiles].forEach(f => console.log(chalk.gray(`  ${f}`)));
      if (skipped.length > 0) {
        console.log(chalk.gray('\nFiles that would be skipped:'));
        skipped.forEach(f => console.log(chalk.yellow(`  ~ ${f}`)));
      }
      return;
    }

    // Confirm
    if (!options.force) {
      const confirmed = await promptUpdateConfirm({
        toUpdate: [...toUpdate, ...newFiles],
        skipped
      });
      if (!confirmed) {
        console.log(chalk.yellow('Cancelled.'));
        return;
      }
    }

    // Apply updates
    const updateSpinner = ora('Applying updates...').start();

    let updated = 0;
    let failed = 0;

    for (const path of [...toUpdate, ...newFiles]) {
      try {
        const srcPath = join(source.claudeDir, path);
        const destPath = join(targetDir, path);

        await fs.ensureDir(join(targetDir, path.split('/').slice(0, -1).join('/')));
        await fs.copy(srcPath, destPath, { overwrite: true });
        updated++;
      } catch (err) {
        failed++;
        if (process.env.DEBUG) {
          console.error(`Failed to update ${path}: ${err.message}`);
        }
      }
    }

    // Update state with new hashes
    const newHashes = await hashDirectory(targetDir);
    await updateState(projectDir, {
      source: source.path,
      originalHashes: newHashes
    });

    updateSpinner.succeed(chalk.green(`Updated ${updated} file(s)`));

    if (failed > 0) {
      console.log(chalk.yellow(`  ${failed} file(s) failed to update`));
    }

    if (skipped.length > 0) {
      console.log(chalk.gray(`\nSkipped files (modified locally):`));
      skipped.slice(0, 5).forEach(f => console.log(chalk.yellow(`  ~ ${f}`)));
      if (skipped.length > 5) {
        console.log(chalk.gray(`  ... and ${skipped.length - 5} more`));
      }
    }

  } catch (error) {
    spinner.fail(chalk.red('Update failed'));
    console.error(chalk.red(error.message));
    if (process.env.DEBUG) {
      console.error(error.stack);
    }
  }
}
