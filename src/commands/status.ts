import pc from 'picocolors';
import { isAkProject } from '../utils/paths.js';
import { loadState, getFileStatuses } from '../utils/state.js';
import fs from 'fs-extra';

export async function statusCommand(options: Record<string, any> = {}): Promise<void> {
  const projectDir = process.cwd();

  // Check if in ak project
  if (!isAkProject(projectDir)) {
    console.log(pc.red('Not in an ak project.'));
    console.log(pc.gray('Run "tk init" first.'));
    return;
  }

  // Load state
  const state = await loadState(projectDir);
  if (!state) {
    console.log(pc.yellow('No state file found.'));
    console.log(pc.gray('This project may have been created without ak.'));
    return;
  }

  // Print project info
  console.log(pc.bold(pc.cyan('\nProject Status\n')));
  console.log(pc.white(`  Kit:     ${state.kit}`));
  console.log(pc.white(`  Target:  ${state.target}`));
  console.log(pc.white(`  Source:  ${state.source}`));
  console.log(pc.gray(`  Created: ${new Date(state.createdAt).toLocaleDateString()}`));
  console.log(pc.gray(`  Updated: ${new Date(state.lastUpdate).toLocaleDateString()}`));
  console.log('');

  // Get file statuses
  const result = await getFileStatuses(projectDir);

  if ('error' in result) {
    console.log(pc.red(`Error: ${result.error}`));
    return;
  }

  const { statuses } = result;

  // Summary
  const total = statuses.unchanged.length + statuses.modified.length + statuses.added.length;
  console.log(pc.cyan('File Status:'));
  console.log(pc.green(`  ✓ ${statuses.unchanged.length} unchanged`));
  if (statuses.modified.length > 0) {
    console.log(pc.yellow(`  ~ ${statuses.modified.length} modified`));
  }
  if (statuses.added.length > 0) {
    console.log(pc.blue(`  + ${statuses.added.length} added locally`));
  }
  if (statuses.deleted.length > 0) {
    console.log(pc.red(`  - ${statuses.deleted.length} deleted`));
  }
  console.log(pc.gray(`  Total: ${total} files tracked`));
  console.log('');

  // Show modified files
  if (statuses.modified.length > 0 && (options.verbose || statuses.modified.length <= 10)) {
    console.log(pc.yellow('Modified files:'));
    for (const file of statuses.modified) {
      console.log(pc.yellow(`  ~ ${file}`));
    }
    console.log('');
  } else if (statuses.modified.length > 10) {
    console.log(pc.yellow(`Modified files: (showing first 10, use --verbose for all)`));
    for (const file of statuses.modified.slice(0, 10)) {
      console.log(pc.yellow(`  ~ ${file}`));
    }
    console.log(pc.gray(`  ... and ${statuses.modified.length - 10} more`));
    console.log('');
  }

  // Show added files
  if (statuses.added.length > 0 && (options.verbose || statuses.added.length <= 5)) {
    console.log(pc.blue('Added locally:'));
    for (const file of statuses.added) {
      console.log(pc.blue(`  + ${file}`));
    }
    console.log('');
  }

  // Installed components
  if (state.installed) {
    console.log(pc.cyan('Installed Components:'));
    const { agents, skills, commands, workflows, router, hooks } = state.installed;

    if (agents && agents.length > 0) {
      console.log(pc.gray(`  Agents:    ${agents.includes('all') ? 'ALL' : agents.length}`));
    }
    if (skills && skills.length > 0) {
      console.log(pc.gray(`  Skills:    ${skills.includes('all') ? 'ALL' : skills.length}`));
    }
    if (commands && commands.length > 0) {
      console.log(pc.gray(`  Commands:  ${commands.includes('all') ? 'ALL' : commands.length}`));
    }
    if (workflows && workflows.length > 0) {
      console.log(pc.gray(`  Workflows: ${workflows.includes('all') ? 'ALL' : workflows.length}`));
    }
    if (router) console.log(pc.gray('  Router:    ✓'));
    if (hooks) console.log(pc.gray('  Hooks:     ✓'));
    console.log('');
  }

  // Check source availability
  if (state.source && !fs.existsSync(state.source)) {
    console.log(pc.yellow('⚠ Source directory not found. Update may not work.'));
    console.log(pc.gray(`  Expected: ${state.source}`));
    console.log('');
  }
}
