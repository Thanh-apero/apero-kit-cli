import fs from 'fs-extra';
import { join } from 'path';
import chalk from 'chalk';
import ora from 'ora';
import { resolveSource, isAkProject } from '../utils/paths.js';
import { copyItems, copyAllOfType, listAvailable } from '../utils/copy.js';
import { loadState, updateState } from '../utils/state.js';
import { hashDirectory } from '../utils/hash.js';

export async function addCommand(item, options = {}) {
  // Parse item format: type:name (e.g., skill:databases, agent:debugger)
  const parts = item.split(':');
  if (parts.length !== 2) {
    console.log(chalk.red('Invalid format. Use: ak add <type>:<name>'));
    console.log(chalk.gray('Examples:'));
    console.log(chalk.gray('  ak add skill:databases'));
    console.log(chalk.gray('  ak add agent:debugger'));
    console.log(chalk.gray('  ak add command:fix/ci'));
    return;
  }

  const [type, name] = parts;
  const validTypes = ['agent', 'agents', 'skill', 'skills', 'command', 'commands', 'workflow', 'workflows'];

  if (!validTypes.includes(type)) {
    console.log(chalk.red(`Invalid type: ${type}`));
    console.log(chalk.gray(`Valid types: agent, skill, command, workflow`));
    return;
  }

  // Normalize type to plural
  const typeMap = {
    agent: 'agents',
    agents: 'agents',
    skill: 'skills',
    skills: 'skills',
    command: 'commands',
    commands: 'commands',
    workflow: 'workflows',
    workflows: 'workflows'
  };
  const normalizedType = typeMap[type];

  const projectDir = options.path || process.cwd();

  // Check if in ak project
  if (!isAkProject(projectDir)) {
    console.log(chalk.red('Not in an ak project.'));
    console.log(chalk.gray('Run "ak init" first or use --path to specify project directory.'));
    return;
  }

  // Load state
  const state = await loadState(projectDir);
  if (!state) {
    console.log(chalk.yellow('Warning: No state file found. Creating fresh state after add.'));
  }

  // Resolve source
  const sourceFlag = options.source || (state ? state.source : null);
  const source = resolveSource(sourceFlag);
  if (source.error) {
    console.log(chalk.red(`Error: ${source.error}`));
    return;
  }

  // Check if item exists in source
  const available = listAvailable(normalizedType, source.claudeDir);
  const exists = available.some(a => a.name === name);

  if (!exists) {
    console.log(chalk.red(`${type} "${name}" not found in source.`));
    console.log(chalk.gray(`Use "ak list ${normalizedType}" to see available options.`));
    return;
  }

  // Determine target directory
  const targetFolder = state?.target || '.claude';
  const targetDir = join(projectDir, targetFolder);

  // Check if already installed
  const destPath = join(targetDir, normalizedType, name);
  const destPathMd = destPath + '.md';
  if (fs.existsSync(destPath) || fs.existsSync(destPathMd)) {
    console.log(chalk.yellow(`${type} "${name}" already exists in project.`));
    console.log(chalk.gray('Use "ak update" to refresh from source.'));
    return;
  }

  // Copy
  const spinner = ora(`Adding ${type} "${name}"...`).start();

  try {
    const result = await copyItems([name], normalizedType, source.claudeDir, targetDir);

    if (result.copied.length > 0) {
      spinner.succeed(chalk.green(`Added ${type}: ${name}`));

      // Update state
      if (state) {
        const installed = state.installed || {};
        installed[normalizedType] = installed[normalizedType] || [];
        if (!installed[normalizedType].includes(name)) {
          installed[normalizedType].push(name);
        }

        // Recalculate hashes
        const newHashes = await hashDirectory(targetDir);

        await updateState(projectDir, {
          installed,
          originalHashes: newHashes
        });
      }

      console.log(chalk.gray(`Location: ${targetFolder}/${normalizedType}/${name}`));
    } else if (result.skipped.length > 0) {
      spinner.fail(chalk.red(`Could not find ${type}: ${name}`));
    } else if (result.errors.length > 0) {
      spinner.fail(chalk.red(`Error adding ${type}: ${result.errors[0].error}`));
    }
  } catch (error) {
    spinner.fail(chalk.red(`Failed to add ${type}`));
    console.error(chalk.red(error.message));
  }
}
