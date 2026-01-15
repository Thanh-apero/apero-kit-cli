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
  promptConfirm
} from '../utils/prompts.js';

export async function initCommand(projectName, options) {
  console.log('');

  // 1. Get project name
  if (!projectName) {
    projectName = await promptProjectName();
  }

  const projectDir = resolve(process.cwd(), projectName);

  // Check if directory exists
  if (fs.existsSync(projectDir) && !options.force) {
    const files = fs.readdirSync(projectDir);
    if (files.length > 0) {
      console.log(chalk.red(`Directory "${projectName}" already exists and is not empty.`));
      console.log(chalk.gray('Use --force to overwrite.'));
      return;
    }
  }

  // 2. Resolve source
  const source = resolveSource(options.source);
  if (source.error) {
    console.log(chalk.red(`Error: ${source.error}`));
    return;
  }

  console.log(chalk.gray(`Source: ${source.path}`));

  // 3. Get kit
  let kitName = options.kit;
  if (!kitName) {
    kitName = await promptKit();
  }

  // 4. Get target
  let target = options.target || 'claude';
  if (!TARGETS[target]) {
    console.log(chalk.yellow(`Unknown target "${target}", using "claude"`));
    target = 'claude';
  }

  // 5. Prepare what to install
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

  if (!await promptConfirm('Proceed?')) {
    console.log(chalk.yellow('Cancelled.'));
    return;
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
    spinner.text = 'Copying agents...';
    if (toInstall.agents === 'all') {
      await copyAllOfType('agents', source.claudeDir, targetDir);
    } else if (toInstall.agents.length > 0) {
      await copyItems(toInstall.agents, 'agents', source.claudeDir, targetDir);
    }

    // Copy skills
    spinner.text = 'Copying skills...';
    if (toInstall.skills === 'all') {
      await copyAllOfType('skills', source.claudeDir, targetDir);
    } else if (toInstall.skills.length > 0) {
      await copyItems(toInstall.skills, 'skills', source.claudeDir, targetDir);
    }

    // Copy commands
    spinner.text = 'Copying commands...';
    if (toInstall.commands === 'all') {
      await copyAllOfType('commands', source.claudeDir, targetDir);
    } else if (toInstall.commands.length > 0) {
      await copyItems(toInstall.commands, 'commands', source.claudeDir, targetDir);
    }

    // Copy workflows
    spinner.text = 'Copying workflows...';
    if (toInstall.workflows === 'all') {
      await copyAllOfType('workflows', source.claudeDir, targetDir);
    } else if (toInstall.workflows && toInstall.workflows.length > 0) {
      await copyItems(toInstall.workflows, 'workflows', source.claudeDir, targetDir);
    }

    // Copy router
    if (toInstall.includeRouter) {
      spinner.text = 'Copying router...';
      await copyRouter(source.claudeDir, targetDir);
    }

    // Copy hooks
    if (toInstall.includeHooks) {
      spinner.text = 'Copying hooks...';
      await copyHooks(source.claudeDir, targetDir);
    }

    // Copy base files
    spinner.text = 'Copying base files...';
    await copyBaseFiles(source.claudeDir, targetDir);

    // Copy AGENTS.md
    if (source.agentsMd) {
      await copyAgentsMd(source.agentsMd, projectDir);
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

    spinner.succeed(chalk.green('Project created successfully!'));

    // Print next steps
    console.log('');
    console.log(chalk.cyan('Next steps:'));
    console.log(chalk.white(`  cd ${projectName}`));
    console.log(chalk.white('  # Start coding with Claude Code'));
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
