import fs from 'fs-extra';
import { join, resolve } from 'path';
import pc from 'picocolors';
import ora from 'ora';
import { KITS, getKit } from '../kits/index.js';
import { resolveSource, getTargetDir, TARGETS, getGlobalInstallPath, type CliTarget } from '../utils/paths.js';
import { copyItems, copyAllOfType, copyRouter, copyHooks, copyBaseFiles, copyAgentsMd, copyDirectory, copyCommandsForGemini, copySkillsForGemini, copyAgentsForGemini, copyGeminiBaseFiles, copyAgentsForDiscord, copyCommandsForDiscord, copySkillsForDiscord, copyDiscordBaseFiles, convertCommandsToSkills, copyBundledSkillsForDiscord, updateDiscordConfig, setupOpenClawConfig } from '../utils/copy.js';
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
    // Password provided via CLI flag (convert to string for comparison)
    if (String(options.password) !== INIT_PASSWORD) {
      console.log(pc.red('Invalid access code. Access denied.'));
      return;
    }
  } else if (process.stdin.isTTY && !options.yes) {
    // Interactive mode - prompt for password
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
    // Non-interactive mode without password
    console.log(pc.red('Access code required. Use --password <code>'));
    return;
  }

  // 1. Get project name (support current directory with "." or empty)
  let projectDir: string;
  let isCurrentDir = false;

  // Handle --global flag
  if (options.global) {
    projectDir = getGlobalInstallPath();
    isCurrentDir = true;
    console.log(pc.cyan(`Installing globally to ${projectDir}`));
  } else if (!projectName || projectName === '.') {
    // Use current directory
    projectDir = process.cwd();
    projectName = '.';
    isCurrentDir = true;
    console.log(pc.gray(`Initializing in current directory: ${projectDir}`));
  } else {
    projectDir = resolve(process.cwd(), projectName);
  }

  // 2. Get CLI targets (Claude, Gemini, Discord, or combination)
  let cliTargets: CliTarget[];
  if (options.target) {
    // Support comma-separated targets: --target claude,gemini,discord
    const targetsFromFlag = options.target.split(',').map((t: string) => t.trim()) as CliTarget[];
    cliTargets = targetsFromFlag.filter(t => t === 'claude' || t === 'gemini' || t === 'discord');
    if (cliTargets.length === 0) {
      console.log(pc.yellow(`Unknown target "${options.target}", using "claude"`));
      cliTargets = ['claude'];
    }
  } else if (!process.stdin.isTTY || options.yes) {
    cliTargets = ['claude'];
  } else {
    cliTargets = await promptCliTargets();
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
    const targetDir = getTargetDir(projectDir, target);

    // Handle --fresh flag (remove existing installation)
    if (options.fresh && fs.existsSync(targetDir)) {
      await fs.remove(targetDir);
      existingTargets.push(TARGETS[target]);
    } else if (fs.existsSync(targetDir) && !options.force) {
      existingTargets.push(TARGETS[target]);
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
    kitName = 'engineer'; // Default kit for --force/--yes mode
  }

  // 5. Set merge mode based on existing action
  const mergeMode = existingAction === 'merge';

  // 6. Prepare what to install
  let toInstall: {
    agents: string[] | 'all';
    commands: string[] | 'all';
    skills: string[] | 'all';
    workflows: string[] | 'all';
    includeRouter: boolean;
    includeHooks: boolean;
  } = {
    agents: [],
    commands: [],
    skills: [],
    workflows: [],
    includeRouter: false,
    includeHooks: false
  };

  if (kitName === 'custom' && !options.yes) {
    // Custom mode - prompt for everything (unless --yes is set)
    console.log(pc.cyan('\nCustom kit configuration:'));
    toInstall.agents = await promptAgents(source.claudeDir);
    toInstall.skills = await promptSkills(source.claudeDir);
    toInstall.commands = await promptCommands(source.claudeDir);
    toInstall.includeRouter = await promptIncludeRouter();
    toInstall.includeHooks = await promptIncludeHooks();
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
  console.log(pc.white(`  Targets: ${cliTargets.map(t => TARGETS[t]).join(', ')}/`));
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

  // 7. Create project
  const spinner = ora('Creating project...').start();

  try {
    // Create project directory
    await fs.ensureDir(projectDir);

    // Install for each CLI target
    for (const target of cliTargets) {
      const targetDir = getTargetDir(projectDir, target);
      await fs.ensureDir(targetDir);

      const targetLabel = target === 'gemini' ? 'Gemini' : target === 'discord' ? 'Discord' : 'Claude';

      // Copy agents
      spinner.text = mergeMode ? `Merging agents (${targetLabel})...` : `Copying agents (${targetLabel})...`;
      if (target === 'gemini') {
        // Convert Claude agent format to Gemini (map model names)
        await copyAgentsForGemini(toInstall.agents, source.claudeDir, targetDir, mergeMode);
      } else if (target === 'discord') {
        // Convert Claude agent format to Discord/Clawbot
        await copyAgentsForDiscord(toInstall.agents, source.claudeDir, targetDir, mergeMode);
      } else {
        if (toInstall.agents === 'all') {
          await copyAllOfType('agents', source.claudeDir, targetDir, mergeMode);
        } else if (toInstall.agents.length > 0) {
          await copyItems(toInstall.agents, 'agents', source.claudeDir, targetDir, mergeMode);
        }
      }

      // Copy skills
      spinner.text = mergeMode ? `Merging skills (${targetLabel})...` : `Copying skills (${targetLabel})...`;
      if (target === 'gemini') {
        await copySkillsForGemini(toInstall.skills, source.claudeDir, targetDir, mergeMode);
      } else if (target === 'discord') {
        await copySkillsForDiscord(toInstall.skills, source.claudeDir, targetDir, mergeMode);
      } else {
        if (toInstall.skills === 'all') {
          await copyAllOfType('skills', source.claudeDir, targetDir, mergeMode);
        } else if (toInstall.skills.length > 0) {
          await copyItems(toInstall.skills, 'skills', source.claudeDir, targetDir, mergeMode);
        }
      }

      // Copy commands
      spinner.text = mergeMode ? `Merging commands (${targetLabel})...` : `Copying commands (${targetLabel})...`;
      if (target === 'gemini') {
        // Convert MD to TOML for Gemini
        await copyCommandsForGemini(toInstall.commands, source.claudeDir, targetDir, mergeMode);
      } else if (target === 'discord') {
        // Convert to Discord/Clawbot format + generate commands.json5
        await copyCommandsForDiscord(toInstall.commands, source.claudeDir, targetDir, mergeMode);
        // Also convert commands to OpenClaw skills format
        spinner.text = mergeMode ? `Converting commands to skills (${targetLabel})...` : `Converting commands to skills (${targetLabel})...`;
        await convertCommandsToSkills(toInstall.commands, source.claudeDir, targetDir, mergeMode);
        // Copy bundled skills (train-prompt, etc.)
        spinner.text = `Copying bundled skills (${targetLabel})...`;
        await copyBundledSkillsForDiscord(targetDir, mergeMode);
      } else {
        if (toInstall.commands === 'all') {
          await copyAllOfType('commands', source.claudeDir, targetDir, mergeMode);
        } else if (toInstall.commands.length > 0) {
          await copyItems(toInstall.commands, 'commands', source.claudeDir, targetDir, mergeMode);
        }
      }

      // Copy workflows (Claude only)
      if (target === 'claude') {
        spinner.text = mergeMode ? `Merging workflows (${targetLabel})...` : `Copying workflows (${targetLabel})...`;
        if (toInstall.workflows === 'all') {
          await copyAllOfType('workflows', source.claudeDir, targetDir, mergeMode);
        } else if (toInstall.workflows && toInstall.workflows.length > 0) {
          await copyItems(toInstall.workflows, 'workflows', source.claudeDir, targetDir, mergeMode);
        }
      }

      // Copy router (Claude only)
      if (target === 'claude' && toInstall.includeRouter) {
        spinner.text = mergeMode ? `Merging router (${targetLabel})...` : `Copying router (${targetLabel})...`;
        await copyRouter(source.claudeDir, targetDir, mergeMode);
      }

      // Copy hooks (Claude only)
      if (target === 'claude' && toInstall.includeHooks) {
        spinner.text = mergeMode ? `Merging hooks (${targetLabel})...` : `Copying hooks (${targetLabel})...`;
        await copyHooks(source.claudeDir, targetDir, mergeMode);
      }

      // Copy extra directories and base files
      if (target === 'claude') {
        spinner.text = mergeMode ? `Merging extras (${targetLabel})...` : `Copying extras (${targetLabel})...`;
        await copyDirectory('memory', source.claudeDir, targetDir, mergeMode);
        await copyDirectory('output-styles', source.claudeDir, targetDir, mergeMode);
        await copyDirectory('scripts', source.claudeDir, targetDir, mergeMode);
        // Copy base files (includes statusline files)
        spinner.text = mergeMode ? `Merging base files (${targetLabel})...` : `Copying base files (${targetLabel})...`;
        await copyBaseFiles(source.claudeDir, targetDir, mergeMode);
      } else if (target === 'gemini') {
        // Copy Gemini settings.json (with plan mode & subagents enabled)
        spinner.text = mergeMode ? `Merging settings (${targetLabel})...` : `Copying settings (${targetLabel})...`;
        await copyGeminiBaseFiles(targetDir, mergeMode);
      } else if (target === 'discord') {
        // Copy Discord/Clawbot config files
        spinner.text = mergeMode ? `Merging config (${targetLabel})...` : `Copying config (${targetLabel})...`;
        await copyDiscordBaseFiles(targetDir, mergeMode);

        // Apply Discord config if provided
        if (discordConfig) {
          spinner.text = 'Configuring Discord bot...';
          await updateDiscordConfig(targetDir, discordConfig.token, discordConfig.guildId);

          // Auto-setup OpenClaw if requested
          if (discordConfig.autoSetup) {
            spinner.text = 'Setting up OpenClaw...';
            const result = await setupOpenClawConfig(discordConfig.token);
            openclawSetupSuccess = result.success;
            if (!result.success) {
              console.log(pc.yellow(`\n  Note: ${result.message}`));
            }
          }
        }
      }
    }

    // Copy AGENTS.md (project root)
    if (source.agentsMd && cliTargets.includes('claude')) {
      await copyAgentsMd(source.agentsMd, projectDir, mergeMode);
    }

    // Create state file
    spinner.text = 'Saving state...';
    await createInitialState(projectDir, {
      kit: kitName,
      source: source.path,
      targets: cliTargets,
      target: TARGETS[cliTargets[0]], // Keep backward compat
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

    const targetNames = cliTargets.map(t => {
      if (t === 'gemini') return 'Gemini CLI';
      if (t === 'discord') return 'Discord + Clawbot';
      return 'Claude Code';
    }).join(' & ');
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

      // Use openclawInstalled from discordConfig (tracks if user installed during setup)
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
