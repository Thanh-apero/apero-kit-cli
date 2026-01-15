import inquirer from 'inquirer';
import chalk from 'chalk';
import { KITS, getKitList } from '../kits/index.js';
import { listAvailable } from './copy.js';

/**
 * Prompt for project name
 */
export async function promptProjectName() {
  const { projectName } = await inquirer.prompt([
    {
      type: 'input',
      name: 'projectName',
      message: 'Project name:',
      default: 'my-project',
      validate: (input) => {
        if (!input.trim()) return 'Project name is required';
        if (!/^[a-zA-Z0-9-_]+$/.test(input)) {
          return 'Project name can only contain letters, numbers, dashes, and underscores';
        }
        return true;
      }
    }
  ]);
  return projectName;
}

/**
 * Prompt for kit selection
 */
export async function promptKit() {
  const kits = getKitList();
  const choices = kits.map(kit => ({
    name: `${kit.emoji}  ${chalk.bold(kit.name.padEnd(12))} - ${kit.description}`,
    value: kit.name
  }));

  // Add custom option
  choices.push({
    name: `🔧  ${chalk.bold('custom'.padEnd(12))} - Pick your own agents, skills, and commands`,
    value: 'custom'
  });

  const { kit } = await inquirer.prompt([
    {
      type: 'list',
      name: 'kit',
      message: 'Select a kit:',
      choices
    }
  ]);

  return kit;
}

/**
 * Prompt for target folder
 */
export async function promptTarget() {
  const { target } = await inquirer.prompt([
    {
      type: 'list',
      name: 'target',
      message: 'Target folder:',
      choices: [
        { name: '.claude/  (Claude Code)', value: 'claude' },
        { name: '.opencode/ (OpenCode)', value: 'opencode' },
        { name: '.agent/   (Generic)', value: 'generic' }
      ],
      default: 'claude'
    }
  ]);
  return target;
}

/**
 * Prompt for custom agent selection
 */
export async function promptAgents(sourceDir) {
  const available = listAvailable('agents', sourceDir);

  if (available.length === 0) {
    return [];
  }

  const choices = available.map(item => ({
    name: item.name,
    value: item.name,
    checked: ['planner', 'debugger'].includes(item.name) // Default selections
  }));

  const { agents } = await inquirer.prompt([
    {
      type: 'checkbox',
      name: 'agents',
      message: 'Select agents:',
      choices,
      pageSize: 15
    }
  ]);

  return agents;
}

/**
 * Prompt for custom skill selection
 */
export async function promptSkills(sourceDir) {
  const available = listAvailable('skills', sourceDir);

  if (available.length === 0) {
    return [];
  }

  const choices = available
    .filter(item => item.isDir) // Skills are directories
    .map(item => ({
      name: item.name,
      value: item.name,
      checked: ['planning', 'debugging'].includes(item.name)
    }));

  const { skills } = await inquirer.prompt([
    {
      type: 'checkbox',
      name: 'skills',
      message: 'Select skills:',
      choices,
      pageSize: 15
    }
  ]);

  return skills;
}

/**
 * Prompt for custom command selection
 */
export async function promptCommands(sourceDir) {
  const available = listAvailable('commands', sourceDir);

  if (available.length === 0) {
    return [];
  }

  const choices = available.map(item => ({
    name: item.name,
    value: item.name,
    checked: ['plan', 'fix', 'code'].includes(item.name)
  }));

  const { commands } = await inquirer.prompt([
    {
      type: 'checkbox',
      name: 'commands',
      message: 'Select commands:',
      choices,
      pageSize: 15
    }
  ]);

  return commands;
}

/**
 * Prompt for router inclusion
 */
export async function promptIncludeRouter() {
  const { includeRouter } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'includeRouter',
      message: 'Include router?',
      default: true
    }
  ]);
  return includeRouter;
}

/**
 * Prompt for hooks inclusion
 */
export async function promptIncludeHooks() {
  const { includeHooks } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'includeHooks',
      message: 'Include hooks?',
      default: false
    }
  ]);
  return includeHooks;
}

/**
 * Prompt for confirmation
 */
export async function promptConfirm(message, defaultValue = true) {
  const { confirmed } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'confirmed',
      message,
      default: defaultValue
    }
  ]);
  return confirmed;
}

/**
 * Prompt for existing target directory action
 */
export async function promptExistingTarget(targetPath) {
  const { action } = await inquirer.prompt([
    {
      type: 'list',
      name: 'action',
      message: `${targetPath} already exists. What do you want to do?`,
      choices: [
        { name: '🔄 Override - Replace all files', value: 'override' },
        { name: '📦 Merge - Only add missing files', value: 'merge' },
        { name: '⏭️  Skip - Do nothing', value: 'skip' }
      ]
    }
  ]);
  return action;
}

/**
 * Prompt for update confirmation with file list
 */
export async function promptUpdateConfirm(updates) {
  console.log(chalk.cyan('\nChanges to apply:'));

  if (updates.toUpdate.length > 0) {
    console.log(chalk.green('  Will update:'));
    updates.toUpdate.slice(0, 10).forEach(f => console.log(chalk.green(`    ✓ ${f}`)));
    if (updates.toUpdate.length > 10) {
      console.log(chalk.gray(`    ... and ${updates.toUpdate.length - 10} more`));
    }
  }

  if (updates.skipped.length > 0) {
    console.log(chalk.yellow('  Will skip (modified locally):'));
    updates.skipped.slice(0, 5).forEach(f => console.log(chalk.yellow(`    ~ ${f}`)));
    if (updates.skipped.length > 5) {
      console.log(chalk.gray(`    ... and ${updates.skipped.length - 5} more`));
    }
  }

  console.log('');

  return promptConfirm('Apply these updates?', true);
}
