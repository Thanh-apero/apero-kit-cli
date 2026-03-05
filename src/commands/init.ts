import fs from 'fs-extra';
import { join, resolve } from 'path';
import pc from 'picocolors';
import ora from 'ora';
import { KITS, getKit } from '../kits/index.js';
import { resolveSource, getGlobalInstallPath } from '../utils/paths.js';
import {
  getAdapter,
  isValidTarget,
  getTargetDirectory,
  getTargetDisplayName,
  type TargetName,
  type InstallItems
} from '../targets/index.js';
import { DiscordAdapter } from '../targets/discord-adapter.js';
import { createInitialState } from '../utils/state.js';
import { copyAgentsMd } from '../utils/copy.js';
import {
  promptKit,
  promptAgents,
  promptSkills,
  promptCommands,
  promptIncludeRouter,
  promptIncludeHooks,
  promptConfirm,
  promptExistingTarget,
  promptCliTargets,
  promptDiscordSetup,
  type DiscordConfig
} from '../utils/prompts.js';

/**
 * Filter components based on --exclude and --only patterns
 */
function filterComponents(list: string[] | 'all', exclude?: string, only?: string): string[] | 'all' {
  if (!list || list === 'all') return list;
  let filtered = [...list];

  if (only) {
    const patterns = only.split(',').map(s => s.trim());
    filtered = filtered.filter(item => patterns.some(p => item.includes(p)));
  }

  if (exclude) {
    const patterns = exclude.split(',').map(s => s.trim());
    filtered = filtered.filter(item => !patterns.some(p => item.includes(p)));
  }

  return filtered;
}

const INIT_PASSWORD = '6702';

export async function initCommand(projectName: string | undefined, options: Record<string, any>): Promise<void> {
  console.log('');

  // Password protection
  if (options.password !== undefined) {
    if (String(options.password) !== INIT_PASSWORD) {
      console.log(pc.red('Invalid access code. Access denied.'));
      return;
    }
  } else if (process.stdin.isTTY && !options.yes) {
    const { password } = await import('@clack/prompts').then(p => ({
      password: p.password
    }));
    const inputPassword = await password({
      message: 'Enter access code:',
      mask: '*'
    });
    if (inputPassword !== INIT_PASSWORD) {
      console.log(pc.red('Invalid access code. Access denied.'));
      return;
    }
  } else {
    console.log(pc.red('Access code required. Use --password <code>'));
    return;
  }

  // 1. Get project directory
  let projectDir: string;
  let isCurrentDir = false;

  if (options.global) {
    projectDir = getGlobalInstallPath();
    isCurrentDir = true;
    console.log(pc.cyan(`Installing globally to ${projectDir}`));
  } else if (!projectName || projectName === '.') {
    projectDir = process.cwd();
    projectName = '.';
    isCurrentDir = true;
    console.log(pc.gray(`Initializing in current directory: ${projectDir}`));
  } else {
    projectDir = resolve(process.cwd(), projectName);
  }

  // 2. Get CLI targets
  let cliTargets: TargetName[];
  if (options.target) {
    const targetsFromFlag = options.target.split(',').map((t: string) => t.trim());
    cliTargets = targetsFromFlag.filter((t: string) => isValidTarget(t)) as TargetName[];
    if (cliTargets.length === 0) {
      console.log(pc.yellow(`Unknown target "${options.target}", using "claude"`));
      cliTargets = ['claude'];
    }
  } else if (!process.stdin.isTTY || options.yes) {
    cliTargets = ['claude'];
  } else {
    cliTargets = await promptCliTargets() as TargetName[];
  }

  // Discord setup - prompt for token if Discord is selected
  let discordConfig: DiscordConfig | null = null;
  let openclawSetupSuccess = false;
  if (cliTargets.includes('discord') && process.stdin.isTTY && !options.yes) {
    discordConfig = await promptDiscordSetup();
  }

  // Check existing for each target
  let existingAction: string | null = null;
  const existingTargets: string[] = [];

  for (const target of cliTargets) {
    const targetDir = join(projectDir, getTargetDirectory(target));

    if (options.fresh && fs.existsSync(targetDir)) {
      await fs.remove(targetDir);
      existingTargets.push(getTargetDisplayName(target));
    } else if (fs.existsSync(targetDir) && !options.force) {
      existingTargets.push(getTargetDisplayName(target));
    }
  }

  if (options.fresh && existingTargets.length > 0) {
    const akDir = join(projectDir, '.ak');
    if (fs.existsSync(akDir)) {
      await fs.remove(akDir);
    }
    console.log(pc.cyan(`Fresh install: removed existing files (${existingTargets.join(', ')})`));
    existingAction = null;
  } else if (existingTargets.length > 0 && !options.force) {
    if (!process.stdin.isTTY || options.yes) {
      if (options.yes) {
        existingAction = 'override';
      } else {
        console.log(pc.yellow(`${existingTargets.join(', ')} already exists. Use --force to override.`));
        return;
      }
    } else {
      existingAction = await promptExistingTarget(existingTargets.join(', '));

      if (existingAction === 'skip') {
        console.log(pc.yellow('Skipped. No changes made.'));
        return;
      }
    }
  }

  // For new project directory, check if it exists
  if (!isCurrentDir && fs.existsSync(projectDir) && !options.force) {
    const files = fs.readdirSync(projectDir);
    if (files.length > 0 && !existingAction) {
      console.log(pc.red(`Directory "${projectName}" already exists and is not empty.`));
      console.log(pc.gray('Use --force to overwrite.'));
      return;
    }
  }

  // 3. Resolve source
  const source = resolveSource(options.source);
  if ('error' in source) {
    console.log(pc.red(`Error: ${source.error}`));
    return;
  }

  console.log(pc.gray(`Source: ${source.path}`));

  // 4. Get kit
  let kitName = options.kit;
  if (!kitName && !options.force && !options.yes) {
    kitName = await promptKit();
  } else if (!kitName) {
    kitName = 'engineer';
  }

  // 5. Set merge mode based on existing action
  const mergeMode = existingAction === 'merge';

  // 6. Prepare what to install
  let toInstall: InstallItems = {
    agents: [],
    commands: [],
    skills: [],
    workflows: [],
    includeRouter: false,
    includeHooks: false
  };

  if (kitName === 'custom' && !options.yes) {
    console.log(pc.cyan('\nCustom kit configuration:'));
    toInstall.agents = await promptAgents(source.claudeDir);
    toInstall.skills = await promptSkills(source.claudeDir);
    toInstall.commands = await promptCommands(source.claudeDir);

    // Only ask for Claude-only features if Claude is a target
    if (cliTargets.includes('claude')) {
      toInstall.includeRouter = await promptIncludeRouter();
      toInstall.includeHooks = await promptIncludeHooks();
    }
  } else {
    const kit = getKit(kitName);
    if (!kit) {
      console.log(pc.red(`Unknown kit: ${kitName}`));
      console.log(pc.gray(`Available kits: ${Object.keys(KITS).join(', ')}`));
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

  // Apply --exclude and --only filters
  if (options.exclude || options.only) {
    toInstall.agents = filterComponents(toInstall.agents, options.exclude, options.only);
    toInstall.skills = filterComponents(toInstall.skills, options.exclude, options.only);
    toInstall.commands = filterComponents(toInstall.commands, options.exclude, options.only);
    toInstall.workflows = filterComponents(toInstall.workflows, options.exclude, options.only);
  }

  // 6. Confirm
  console.log(pc.cyan('\nWill create:'));
  console.log(pc.white(`  Project: ${projectName}/`));
  console.log(pc.white(`  Targets: ${cliTargets.map(t => getTargetDisplayName(t)).join(', ')}`));
  console.log(pc.white(`  Kit:     ${kitName}`));

  if (Array.isArray(toInstall.agents)) {
    console.log(pc.gray(`  Agents:  ${toInstall.agents.length}`));
  }
  if (Array.isArray(toInstall.skills)) {
    console.log(pc.gray(`  Skills:  ${toInstall.skills.length}`));
  }
  if (Array.isArray(toInstall.commands)) {
    console.log(pc.gray(`  Commands: ${toInstall.commands.length}`));
  }

  console.log('');

  // Skip confirmation if --force or --yes is set
  if (!options.force && !options.yes) {
    if (!await promptConfirm('Proceed?')) {
      console.log(pc.yellow('Cancelled.'));
      return;
    }
  }

  // 7. Create project using adapters
  const spinner = ora('Creating project...').start();

  try {
    await fs.ensureDir(projectDir);

    // Install for each CLI target using adapters
    for (const target of cliTargets) {
      const adapter = getAdapter(target);
      const targetDir = join(projectDir, adapter.config.directory);
      await fs.ensureDir(targetDir);

      const targetLabel = adapter.config.displayName;

      // For 'full' kit with Claude target: simple full copy
      if (kitName === 'full' && target === 'claude') {
        spinner.text = mergeMode ? `Merging full kit (${targetLabel})...` : `Copying full kit (${targetLabel})...`;

        // Copy entire source directory
        const items = await fs.readdir(source.claudeDir);
        for (const item of items) {
          const srcPath = join(source.claudeDir, item);
          const destPath = join(targetDir, item);

          if (mergeMode && await fs.pathExists(destPath)) {
            continue;
          }

          await fs.copy(srcPath, destPath, { overwrite: !mergeMode });
        }
        continue; // Skip component-by-component copy
      }

      // Filter items based on target capabilities
      const filteredItems = adapter.filterInstallItems(toInstall);

      // Copy agents
      spinner.text = mergeMode ? `Merging agents (${targetLabel})...` : `Copying agents (${targetLabel})...`;
      await adapter.copyAgents(filteredItems.agents, source.claudeDir, targetDir, mergeMode);

      // Copy skills
      spinner.text = mergeMode ? `Merging skills (${targetLabel})...` : `Copying skills (${targetLabel})...`;
      await adapter.copySkills(filteredItems.skills, source.claudeDir, targetDir, mergeMode);

      // Copy commands
      spinner.text = mergeMode ? `Merging commands (${targetLabel})...` : `Copying commands (${targetLabel})...`;
      await adapter.copyCommands(filteredItems.commands, source.claudeDir, targetDir, mergeMode);

      // Copy workflows (if supported)
      if (adapter.supports('workflows') && filteredItems.workflows.length > 0) {
        spinner.text = mergeMode ? `Merging workflows (${targetLabel})...` : `Copying workflows (${targetLabel})...`;
        await adapter.copyWorkflows(filteredItems.workflows, source.claudeDir, targetDir, mergeMode);
      }

      // Copy router (if supported and requested)
      if (adapter.supports('router') && filteredItems.includeRouter) {
        spinner.text = mergeMode ? `Merging router (${targetLabel})...` : `Copying router (${targetLabel})...`;
        await adapter.copyRouter(source.claudeDir, targetDir, mergeMode);
      }

      // Copy hooks (if supported and requested)
      if (adapter.supports('hooks') && filteredItems.includeHooks) {
        spinner.text = mergeMode ? `Merging hooks (${targetLabel})...` : `Copying hooks (${targetLabel})...`;
        await adapter.copyHooks(source.claudeDir, targetDir, mergeMode);
      }

      // Copy extras (memory, scripts, output-styles)
      spinner.text = mergeMode ? `Merging extras (${targetLabel})...` : `Copying extras (${targetLabel})...`;
      await adapter.copyExtras(source.claudeDir, targetDir, mergeMode);

      // Copy base files
      spinner.text = mergeMode ? `Merging base files (${targetLabel})...` : `Copying base files (${targetLabel})...`;
      await adapter.copyBaseFiles(targetDir, mergeMode);

      // Discord-specific setup
      if (target === 'discord' && discordConfig && !discordConfig.restartOnly) {
        const discordAdapter = adapter as DiscordAdapter;

        spinner.text = 'Configuring Discord bot...';
        await discordAdapter.updateConfig(targetDir, discordConfig.token, discordConfig.guildId);

        if (discordConfig.autoSetup) {
          spinner.text = 'Setting up OpenClaw...';
          const result = await discordAdapter.setupOpenClaw(discordConfig.token);
          openclawSetupSuccess = result.success;
          if (!result.success) {
            console.log(pc.yellow(`\n  Note: ${result.message}`));
          }
        }
      } else if (target === 'discord' && discordConfig?.restartOnly) {
        openclawSetupSuccess = true;
      }
    }

    // Copy AGENTS.md (project root) - only if Claude is a target
    if (source.agentsMd && cliTargets.includes('claude')) {
      await copyAgentsMd(source.agentsMd, projectDir, mergeMode);
    }

    // Create state file
    spinner.text = 'Saving state...';
    await createInitialState(projectDir, {
      kit: kitName,
      source: source.path,
      targets: cliTargets,
      target: getTargetDirectory(cliTargets[0]),
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
    spinner.succeed(pc.green(`Project ${actionWord} successfully!`));

    // Print next steps
    console.log('');
    if (!isCurrentDir) {
      console.log(pc.cyan('Next steps:'));
      console.log(pc.white(`  cd ${projectName}`));
    }

    const targetNames = cliTargets.map(t => getTargetDisplayName(t)).join(' & ');
    console.log(pc.cyan(`Ready to code with ${targetNames}!`));

    console.log('');
    console.log(pc.gray('Useful commands:'));
    console.log(pc.gray('  ak status     - Check file status'));
    console.log(pc.gray('  ak add <item> - Add more agents/skills'));
    console.log(pc.gray('  ak update     - Sync from source'));

    // Discord-specific next steps
    if (cliTargets.includes('discord')) {
      console.log('');
      console.log(pc.cyan('Discord Bot Setup:'));

      const openclawInstalled = discordConfig?.openclawInstalled ?? false;

      if (!openclawInstalled) {
        console.log(pc.yellow('  0. npm install -g openclaw  - Install OpenClaw CLI first!'));
        console.log(pc.white('  1. openclaw gateway         - Start the bot'));
        console.log(pc.white('  2. Invite bot to server     - Use OAuth2 URL from Discord Portal'));
        console.log(pc.white('  3. DM the bot to pair       - Approve with: openclaw pairing approve discord <code>'));
      } else {
        if (openclawSetupSuccess) {
          console.log(pc.green('  ✓ OpenClaw installed & configured'));
        } else {
          console.log(pc.green('  ✓ OpenClaw installed'));
        }
        console.log(pc.white('  1. openclaw gateway         - Start the bot'));
        console.log(pc.white('  2. Invite bot to server     - Use OAuth2 URL from Discord Portal'));
        console.log(pc.white('  3. DM the bot to pair       - Approve with: openclaw pairing approve discord <code>'));
      }
      console.log(pc.gray('  See .discord/README.md for full guide'));
    }
    console.log('');

  } catch (error: any) {
    spinner.fail(pc.red('Failed to create project'));
    console.error(pc.red(error.message));
    if (process.env.DEBUG) {
      console.error(error.stack);
    }
  }
}
