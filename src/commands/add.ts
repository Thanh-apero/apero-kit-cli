import fs from 'fs-extra';
import { join } from 'path';
import pc from 'picocolors';
import ora from 'ora';
import { resolveSource, isAkProject } from '../utils/paths.js';
import { copyItems, listAvailable } from '../utils/copy.js';
import { loadState, updateState } from '../utils/state.js';
import { hashDirectory } from '../utils/hash.js';

export async function addCommand(item: string, options: Record<string, any> = {}): Promise<void> {
  // Parse item format: type:name (e.g., skill:databases, agent:debugger)
  const parts = item.split(':');
  if (parts.length !== 2) {
    console.log(pc.red('Invalid format. Use: tk add <type>:<name>'));
    console.log(pc.gray('Examples:'));
    console.log(pc.gray('  tk add skill:databases'));
    console.log(pc.gray('  tk add agent:debugger'));
    console.log(pc.gray('  tk add command:fix/ci'));
    return;
  }

  const [type, name] = parts;
  const validTypes = ['agent', 'agents', 'skill', 'skills', 'command', 'commands', 'workflow', 'workflows'];

  if (!validTypes.includes(type)) {
    console.log(pc.red(`Invalid type: ${type}`));
    console.log(pc.gray(`Valid types: agent, skill, command, workflow`));
    return;
  }

  // Normalize type to plural
  const typeMap: Record<string, string> = {
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
    console.log(pc.red('Not in an ak project.'));
    console.log(pc.gray('Run "tk init" first or use --path to specify project directory.'));
    return;
  }

  // Load state
  const state = await loadState(projectDir);
  if (!state) {
    console.log(pc.yellow('Warning: No state file found. Creating fresh state after add.'));
  }

  // Resolve source
  const sourceFlag = options.source || (state ? state.source : null);
  const source = resolveSource(sourceFlag);
  if ('error' in source) {
    console.log(pc.red(`Error: ${source.error}`));
    return;
  }

  // Check if item exists in source
  const available = listAvailable(normalizedType, source.claudeDir);
  const exists = available.some(a => a.name === name);

  if (!exists) {
    console.log(pc.red(`${type} "${name}" not found in source.`));
    console.log(pc.gray(`Use "tk list ${normalizedType}" to see available options.`));
    return;
  }

  // Determine target directory
  const targetFolder = state?.target || '.claude';
  const targetDir = join(projectDir, targetFolder);

  // Check if already installed
  const destPath = join(targetDir, normalizedType, name);
  const destPathMd = destPath + '.md';
  if (fs.existsSync(destPath) || fs.existsSync(destPathMd)) {
    console.log(pc.yellow(`${type} "${name}" already exists in project.`));
    console.log(pc.gray('Use "tk update" to refresh from source.'));
    return;
  }

  // Copy
  const spinner = ora(`Adding ${type} "${name}"...`).start();

  try {
    const result = await copyItems([name], normalizedType, source.claudeDir, targetDir);

    if (result.copied.length > 0) {
      spinner.succeed(pc.green(`Added ${type}: ${name}`));

      // Update state
      if (state) {
        const installed = state.installed || {};
        const typeArray = installed[normalizedType as keyof typeof installed];
        if (!typeArray) {
          (installed as any)[normalizedType] = [name];
        } else if (Array.isArray(typeArray) && !typeArray.includes(name)) {
          typeArray.push(name);
        }

        // Recalculate hashes
        const newHashes = await hashDirectory(targetDir);

        await updateState(projectDir, {
          installed,
          originalHashes: newHashes
        });
      }

      console.log(pc.gray(`Location: ${targetFolder}/${normalizedType}/${name}`));
    } else if (result.skipped.length > 0) {
      spinner.fail(pc.red(`Could not find ${type}: ${name}`));
    } else if (result.errors.length > 0) {
      spinner.fail(pc.red(`Error adding ${type}: ${result.errors[0].error}`));
    }
  } catch (error: any) {
    spinner.fail(pc.red(`Failed to add ${type}`));
    console.error(pc.red(error.message));
  }
}
