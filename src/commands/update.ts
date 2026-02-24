import fs from 'fs-extra';
import { join } from 'path';
import pc from 'picocolors';
import ora from 'ora';
import { resolveSource, isAkProject } from '../utils/paths.js';
import { loadState, updateState, getFileStatuses } from '../utils/state.js';
import { hashFile, hashDirectory } from '../utils/hash.js';
import { promptUpdateConfirm } from '../utils/prompts.js';

export async function updateCommand(options: Record<string, any> = {}): Promise<void> {
  const projectDir = process.cwd();

  // Check if in ak project
  if (!isAkProject(projectDir)) {
    console.log(pc.red('Not in an ak project.'));
    console.log(pc.gray('Run "ak init" first.'));
    return;
  }

  // Load state
  const state = await loadState(projectDir);
  if (!state) {
    console.log(pc.red('No state file found.'));
    console.log(pc.gray('This project may have been created without ak. Run "ak doctor" for more info.'));
    return;
  }

  // Resolve source
  const sourceFlag = options.source || state.source;
  const source = resolveSource(sourceFlag);
  if ('error' in source) {
    console.log(pc.red(`Error: ${source.error}`));
    return;
  }

  console.log(pc.gray(`Source: ${source.path}`));
  console.log(pc.gray(`Target: ${state.target}`));
  console.log('');

  const spinner = ora('Checking for updates...').start();

  try {
    // Get current file statuses
    const result = await getFileStatuses(projectDir);
    if ('error' in result) {
      spinner.fail(pc.red(result.error));
      return;
    }

    const { statuses, targetDir } = result;

    // Determine what types to update
    let typesToUpdate = ['agents', 'skills', 'commands', 'workflows'];
    if (options.agents) typesToUpdate = ['agents'];
    if (options.skills) typesToUpdate = ['skills'];
    if (options.commands) typesToUpdate = ['commands'];

    // Get source hashes
    const sourceHashes: Record<string, string> = {};
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
    const toUpdate: string[] = [];
    const skipped: string[] = [];
    const newFiles: string[] = [];

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
      console.log(pc.green('✓ Already up to date!'));
      if (skipped.length > 0) {
        console.log(pc.yellow(`  ${skipped.length} file(s) skipped (modified locally)`));
      }
      return;
    }

    console.log(pc.cyan('Updates available:'));
    console.log(pc.green(`  ${toUpdate.length} file(s) to update`));
    console.log(pc.blue(`  ${newFiles.length} new file(s)`));
    if (skipped.length > 0) {
      console.log(pc.yellow(`  ${skipped.length} file(s) skipped (modified locally)`));
    }
    console.log('');

    // Dry run mode
    if (options.dryRun) {
      console.log(pc.cyan('Dry run - no changes made'));
      console.log(pc.gray('\nFiles that would be updated:'));
      [...toUpdate, ...newFiles].forEach(f => console.log(pc.gray(`  ${f}`)));
      if (skipped.length > 0) {
        console.log(pc.gray('\nFiles that would be skipped:'));
        skipped.forEach(f => console.log(pc.yellow(`  ~ ${f}`)));
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
        console.log(pc.yellow('Cancelled.'));
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
      } catch (err: any) {
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

    updateSpinner.succeed(pc.green(`Updated ${updated} file(s)`));

    if (failed > 0) {
      console.log(pc.yellow(`  ${failed} file(s) failed to update`));
    }

    if (skipped.length > 0) {
      console.log(pc.gray(`\nSkipped files (modified locally):`));
      skipped.slice(0, 5).forEach(f => console.log(pc.yellow(`  ~ ${f}`)));
      if (skipped.length > 5) {
        console.log(pc.gray(`  ... and ${skipped.length - 5} more`));
      }
    }

  } catch (error: any) {
    spinner.fail(pc.red('Update failed'));
    console.error(pc.red(error.message));
    if (process.env.DEBUG) {
      console.error(error.stack);
    }
  }
}
