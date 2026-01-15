import fs from 'fs-extra';
import { join, resolve } from 'path';
import chalk from 'chalk';
import ora from 'ora';
import { KITS, getKit } from '../kits/index.js';
import { resolveSource, getTargetDir, TARGETS } from '../utils/paths.js';
import { copyItems, copyAllOfType, copyRouter, copyHooks, copyBaseFiles, copyAgentsMd } from '../utils/copy.js';
import { createInitialState } from '../utils/state.js';
import {
  promptProjectName,
  promptKit,
  promptTarget,
  promptAgents,
  promptSkills,
  promptCommands,
  promptIncludeRouter,
  promptIncludeHooks,
  promptConfirm,
  promptExistingTarget
} from '../utils/prompts.js';

export async function initCommand(projectName, options) {
  console.log('');

  // 1. Get project name (support current directory with "." or empty)
  let projectDir;
  let isCurrentDir = false;

  if (!projectName || projectName === '.') {
    // Use current directory
    projectDir = process.cwd();
    projectName = '.';
    isCurrentDir = true;
    console.log(chalk.gray(`Initializing in current directory: ${projectDir}`));
  } else {
    projectDir = resolve(process.cwd(), projectName);
  }

  // 2. Get target early to check existing
  let target = options.target || 'claude';
  if (!TARGETS[target]) {
    console.log(chalk.yellow(`Unknown target "${target}", using "claude"`));
    target = 'claude';
  }

  const targetDir = getTargetDir(projectDir, target);
  let existingAction = null;

  // Check if target directory (.claude, .opencode, etc.) already exists
  if (fs.existsSync(targetDir) && !options.force) {
    if (!process.stdin.isTTY) {
      // Non-interactive mode - skip
      console.log(chalk.yellow(`${TARGETS[target]} already exists. Use --force to override.`));
      return;
    }

    existingAction = await promptExistingTarget(TARGETS[target]);

    if (existingAction === 'skip') {
      console.log(chalk.yellow('Skipped. No changes made.'));
      return;
    }
  }

  // For new project directory, check if it exists
  if (!isCurrentDir && fs.existsSync(projectDir) && !options.force) {
    const files = fs.readdirSync(projectDir);
    if (files.length > 0 && !existingAction) {
      console.log(chalk.red(`Directory "${projectName}" already exists and is not empty.`));
      console.log(chalk.gray('Use --force to overwrite.'));
      return;
    }
  }

  // 3. Resolve source
  const source = resolveSource(options.source);
  if (source.error) {
    console.log(chalk.red(`Error: ${source.error}`));
    return;
  }

  console.log(chalk.gray(`Source: ${source.path}`));

  // 4. Get kit
  let kitName = options.kit;
  if (!kitName && !options.force) {
    kitName = await promptKit();
  } else if (!kitName) {
    kitName = 'engineer'; // Default kit for --force mode
  }

  // 5. Set merge mode based on existing action
  const mergeMode = existingAction === 'merge';

  // 6. Prepare what to install
  let toInstall = {
    agents: [],
    commands: [],
    skills: [],
    workflows: [],
    includeRouter: false,
    includeHooks: false
  };

  if (kitName === 'custom') {
    // Custom mode - prompt for everything
    console.log(chalk.cyan('\nCustom kit configuration:'));
    toInstall.agents = await promptAgents(source.claudeDir);
    toInstall.skills = await promptSkills(source.claudeDir);
    toInstall.commands = await promptCommands(source.claudeDir);
    toInstall.includeRouter = await promptIncludeRouter();
    toInstall.includeHooks = await promptIncludeHooks();
  } else {
    const kit = getKit(kitName);
    if (!kit) {
      console.log(chalk.red(`Unknown kit: ${kitName}`));
      console.log(chalk.gray(`Available kits: ${Object.keys(KITS).join(', ')}`));
      return;
    }

    toInstall = {
      agents: kit.agents,
      commands: kit.commands,
      skills: kit.skills,
      workflows: kit.workflows || [],
      includeRouter: kit.includeRouter,
      includeHooks: kit.includeHooks
    };
  }

  // 6. Confirm
  console.log(chalk.cyan('\nWill create:'));
  console.log(chalk.white(`  Project: ${projectName}/`));
  console.log(chalk.white(`  Target:  ${TARGETS[target]}/`));
  console.log(chalk.white(`  Kit:     ${kitName}`));

  if (Array.isArray(toInstall.agents)) {
    console.log(chalk.gray(`  Agents:  ${toInstall.agents.length}`));
  }
  if (Array.isArray(toInstall.skills)) {
    console.log(chalk.gray(`  Skills:  ${toInstall.skills.length}`));
  }
  if (Array.isArray(toInstall.commands)) {
    console.log(chalk.gray(`  Commands: ${toInstall.commands.length}`));
  }

  console.log('');

  // Skip confirmation if --force is set
  if (!options.force) {
    if (!await promptConfirm('Proceed?')) {
      console.log(chalk.yellow('Cancelled.'));
      return;
    }
  }

  // 7. Create project
  const spinner = ora('Creating project...').start();

  try {
    // Create project directory
    await fs.ensureDir(projectDir);

    // Create target directory
    const targetDir = getTargetDir(projectDir, target);
    await fs.ensureDir(targetDir);

    // Copy agents
    spinner.text = mergeMode ? 'Merging agents...' : 'Copying agents...';
    if (toInstall.agents === 'all') {
      await copyAllOfType('agents', source.claudeDir, targetDir, mergeMode);
    } else if (toInstall.agents.length > 0) {
      await copyItems(toInstall.agents, 'agents', source.claudeDir, targetDir, mergeMode);
    }

    // Copy skills
    spinner.text = mergeMode ? 'Merging skills...' : 'Copying skills...';
    if (toInstall.skills === 'all') {
      await copyAllOfType('skills', source.claudeDir, targetDir, mergeMode);
    } else if (toInstall.skills.length > 0) {
      await copyItems(toInstall.skills, 'skills', source.claudeDir, targetDir, mergeMode);
    }

    // Copy commands
    spinner.text = mergeMode ? 'Merging commands...' : 'Copying commands...';
    if (toInstall.commands === 'all') {
      await copyAllOfType('commands', source.claudeDir, targetDir, mergeMode);
    } else if (toInstall.commands.length > 0) {
      await copyItems(toInstall.commands, 'commands', source.claudeDir, targetDir, mergeMode);
    }

    // Copy workflows
    spinner.text = mergeMode ? 'Merging workflows...' : 'Copying workflows...';
    if (toInstall.workflows === 'all') {
      await copyAllOfType('workflows', source.claudeDir, targetDir, mergeMode);
    } else if (toInstall.workflows && toInstall.workflows.length > 0) {
      await copyItems(toInstall.workflows, 'workflows', source.claudeDir, targetDir, mergeMode);
    }

    // Copy router
    if (toInstall.includeRouter) {
      spinner.text = mergeMode ? 'Merging router...' : 'Copying router...';
      await copyRouter(source.claudeDir, targetDir, mergeMode);
    }

    // Copy hooks
    if (toInstall.includeHooks) {
      spinner.text = mergeMode ? 'Merging hooks...' : 'Copying hooks...';
      await copyHooks(source.claudeDir, targetDir, mergeMode);
    }

    // Copy base files
    spinner.text = mergeMode ? 'Merging base files...' : 'Copying base files...';
    await copyBaseFiles(source.claudeDir, targetDir, mergeMode);

    // Copy AGENTS.md
    if (source.agentsMd) {
      await copyAgentsMd(source.agentsMd, projectDir, mergeMode);
    }

    // Create state file
    spinner.text = 'Saving state...';
    await createInitialState(projectDir, {
      kit: kitName,
      source: source.path,
      target: TARGETS[target],
      installed: {
        agents: toInstall.agents === 'all' ? ['all'] : toInstall.agents,
        skills: toInstall.skills === 'all' ? ['all'] : toInstall.skills,
        commands: toInstall.commands === 'all' ? ['all'] : toInstall.commands,
        workflows: toInstall.workflows === 'all' ? ['all'] : (toInstall.workflows || []),
        router: toInstall.includeRouter,
        hooks: toInstall.includeHooks
      }
    });

    const actionWord = mergeMode ? 'merged' : (existingAction === 'override' ? 'overridden' : 'created');
    spinner.succeed(chalk.green(`Project ${actionWord} successfully!`));

    // Print next steps
    console.log('');
    if (!isCurrentDir) {
      console.log(chalk.cyan('Next steps:'));
      console.log(chalk.white(`  cd ${projectName}`));
      console.log(chalk.white('  # Start coding with Claude Code'));
    } else {
      console.log(chalk.cyan('Ready to code with Claude Code!'));
    }
    console.log('');
    console.log(chalk.gray('Useful commands:'));
    console.log(chalk.gray('  ak status     - Check file status'));
    console.log(chalk.gray('  ak add <item> - Add more agents/skills'));
    console.log(chalk.gray('  ak update     - Sync from source'));
    console.log('');

  } catch (error) {
    spinner.fail(chalk.red('Failed to create project'));
    console.error(chalk.red(error.message));
    if (process.env.DEBUG) {
      console.error(error.stack);
    }
  }
}
