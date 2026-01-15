import chalk from 'chalk';
import { isAkProject } from '../utils/paths.js';
import { loadState, getFileStatuses } from '../utils/state.js';
import fs from 'fs-extra';
import { join } from 'path';

export async function statusCommand(options = {}) {
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
    console.log(chalk.yellow('No state file found.'));
    console.log(chalk.gray('This project may have been created without ak.'));
    return;
  }

  // Print project info
  console.log(chalk.cyan.bold('\nProject Status\n'));
  console.log(chalk.white(`  Kit:     ${state.kit}`));
  console.log(chalk.white(`  Target:  ${state.target}`));
  console.log(chalk.white(`  Source:  ${state.source}`));
  console.log(chalk.gray(`  Created: ${new Date(state.createdAt).toLocaleDateString()}`));
  console.log(chalk.gray(`  Updated: ${new Date(state.lastUpdate).toLocaleDateString()}`));
  console.log('');

  // Get file statuses
  const result = await getFileStatuses(projectDir);

  if (result.error) {
    console.log(chalk.red(`Error: ${result.error}`));
    return;
  }

  const { statuses } = result;

  // Summary
  const total = statuses.unchanged.length + statuses.modified.length + statuses.added.length;
  console.log(chalk.cyan('File Status:'));
  console.log(chalk.green(`  ✓ ${statuses.unchanged.length} unchanged`));
  if (statuses.modified.length > 0) {
    console.log(chalk.yellow(`  ~ ${statuses.modified.length} modified`));
  }
  if (statuses.added.length > 0) {
    console.log(chalk.blue(`  + ${statuses.added.length} added locally`));
  }
  if (statuses.deleted.length > 0) {
    console.log(chalk.red(`  - ${statuses.deleted.length} deleted`));
  }
  console.log(chalk.gray(`  Total: ${total} files tracked`));
  console.log('');

  // Show modified files
  if (statuses.modified.length > 0 && (options.verbose || statuses.modified.length <= 10)) {
    console.log(chalk.yellow('Modified files:'));
    for (const file of statuses.modified) {
      console.log(chalk.yellow(`  ~ ${file}`));
    }
    console.log('');
  } else if (statuses.modified.length > 10) {
    console.log(chalk.yellow(`Modified files: (showing first 10, use --verbose for all)`));
    for (const file of statuses.modified.slice(0, 10)) {
      console.log(chalk.yellow(`  ~ ${file}`));
    }
    console.log(chalk.gray(`  ... and ${statuses.modified.length - 10} more`));
    console.log('');
  }

  // Show added files
  if (statuses.added.length > 0 && (options.verbose || statuses.added.length <= 5)) {
    console.log(chalk.blue('Added locally:'));
    for (const file of statuses.added) {
      console.log(chalk.blue(`  + ${file}`));
    }
    console.log('');
  }

  // Installed components
  if (state.installed) {
    console.log(chalk.cyan('Installed Components:'));
    const { agents, skills, commands, workflows, router, hooks } = state.installed;

    if (agents && agents.length > 0) {
      console.log(chalk.gray(`  Agents:    ${agents.includes('all') ? 'ALL' : agents.length}`));
    }
    if (skills && skills.length > 0) {
      console.log(chalk.gray(`  Skills:    ${skills.includes('all') ? 'ALL' : skills.length}`));
    }
    if (commands && commands.length > 0) {
      console.log(chalk.gray(`  Commands:  ${commands.includes('all') ? 'ALL' : commands.length}`));
    }
    if (workflows && workflows.length > 0) {
      console.log(chalk.gray(`  Workflows: ${workflows.includes('all') ? 'ALL' : workflows.length}`));
    }
    if (router) console.log(chalk.gray('  Router:    ✓'));
    if (hooks) console.log(chalk.gray('  Hooks:     ✓'));
    console.log('');
  }

  // Check source availability
  if (state.source && !fs.existsSync(state.source)) {
    console.log(chalk.yellow('⚠ Source directory not found. Update may not work.'));
    console.log(chalk.gray(`  Expected: ${state.source}`));
    console.log('');
  }
}
