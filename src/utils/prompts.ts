import * as p from '@clack/prompts';
import pc from 'picocolors';
import { getKitList } from '../kits/index.js';
import { listAvailable } from './copy.js';
import type { CliTarget } from './paths.js';

export async function promptProjectName(): Promise<string> {
  const name = await p.text({
    message: 'Project name:',
    placeholder: 'my-project',
    validate: (value) => {
      if (!value || !value.trim()) return 'Project name is required';
      if (!/^[a-zA-Z0-9-_]+$/.test(String(value))) return 'Only letters, numbers, dashes, underscores';
    }
  });
  if (p.isCancel(name)) process.exit(0);
  return name as string;
}

export async function promptKit(): Promise<string> {
  const kits = getKitList();
  const options = [
    ...kits.map((kit) => ({
      value: kit.name,
      label: `${kit.emoji}  ${kit.name}`,
      hint: kit.description
    })),
    { value: 'custom', label: '🔧  custom', hint: 'Pick your own agents, skills, and commands' }
  ];
  const kit = await p.select({ message: 'Select a kit:', options });
  if (p.isCancel(kit)) process.exit(0);
  return kit as string;
}

export async function promptTarget(): Promise<string> {
  const target = await p.select({
    message: 'Target folder:',
    options: [
      { value: 'claude', label: '.claude/', hint: 'Claude Code' },
      { value: 'gemini', label: '.gemini/', hint: 'Gemini CLI' },
      { value: 'opencode', label: '.opencode/', hint: 'OpenCode' },
      { value: 'generic', label: '.agent/', hint: 'Generic' }
    ]
  });
  if (p.isCancel(target)) process.exit(0);
  return target as string;
}

export async function promptCliTargets(): Promise<CliTarget[]> {
  const selection = await p.multiselect({
    message: 'Select AI CLI target(s):',
    options: [
      { value: 'claude', label: 'Claude Code', hint: '.claude/' },
      { value: 'gemini', label: 'Gemini CLI', hint: '.gemini/' },
      { value: 'discord', label: 'Discord + Clawbot', hint: '.discord/' }
    ],
    initialValues: ['claude'],
    required: true
  });
  if (p.isCancel(selection)) process.exit(0);

  return selection as CliTarget[];
}

export async function promptAgents(sourceDir: string): Promise<string[]> {
  const available = listAvailable('agents', sourceDir);
  if (available.length === 0) return [];
  const selected = await p.multiselect({
    message: 'Select agents:',
    options: available.map((item) => ({
      value: item.name,
      label: item.name,
      hint: ['planner', 'debugger'].includes(item.name) ? '(recommended)' : undefined
    })),
    initialValues: ['planner', 'debugger'].filter(n => available.some((a) => a.name === n))
  });
  if (p.isCancel(selected)) process.exit(0);
  return selected as string[];
}

export async function promptSkills(sourceDir: string): Promise<string[]> {
  const available = listAvailable('skills', sourceDir).filter((s) => s.isDir);
  if (available.length === 0) return [];
  const selected = await p.multiselect({
    message: 'Select skills:',
    options: available.map((item) => ({
      value: item.name,
      label: item.name,
      hint: ['planning', 'debugging'].includes(item.name) ? '(recommended)' : undefined
    })),
    initialValues: ['planning', 'debugging'].filter(n => available.some((a) => a.name === n))
  });
  if (p.isCancel(selected)) process.exit(0);
  return selected as string[];
}

export async function promptCommands(sourceDir: string): Promise<string[]> {
  const available = listAvailable('commands', sourceDir);
  if (available.length === 0) return [];
  const selected = await p.multiselect({
    message: 'Select commands:',
    options: available.map((item) => ({
      value: item.name,
      label: item.name,
      hint: ['plan', 'fix', 'code'].includes(item.name) ? '(recommended)' : undefined
    })),
    initialValues: ['plan', 'fix', 'code'].filter(n => available.some((a) => a.name === n))
  });
  if (p.isCancel(selected)) process.exit(0);
  return selected as string[];
}

export async function promptIncludeRouter(): Promise<boolean> {
  const result = await p.confirm({ message: 'Include router?', initialValue: true });
  if (p.isCancel(result)) process.exit(0);
  return result as boolean;
}

export async function promptIncludeHooks(): Promise<boolean> {
  const result = await p.confirm({ message: 'Include hooks?', initialValue: false });
  if (p.isCancel(result)) process.exit(0);
  return result as boolean;
}

export async function promptConfirm(message: string, defaultValue: boolean = true): Promise<boolean> {
  const result = await p.confirm({ message, initialValue: defaultValue });
  if (p.isCancel(result)) process.exit(0);
  return result as boolean;
}

export async function promptExistingTarget(targetPath: string): Promise<string> {
  const action = await p.select({
    message: `${targetPath} already exists. What do you want to do?`,
    options: [
      { value: 'override', label: 'Override', hint: 'Replace all files' },
      { value: 'merge', label: 'Merge', hint: 'Only add missing files' },
      { value: 'skip', label: 'Skip', hint: 'Do nothing' }
    ]
  });
  if (p.isCancel(action)) process.exit(0);
  return action as string;
}

export async function promptUpdateConfirm(updates: { toUpdate: string[]; skipped: string[] }): Promise<boolean> {
  console.log(pc.cyan('\nChanges to apply:'));
  if (updates.toUpdate.length > 0) {
    console.log(pc.green('  Will update:'));
    updates.toUpdate.slice(0, 10).forEach(f => console.log(pc.green(`    ✓ ${f}`)));
    if (updates.toUpdate.length > 10) console.log(pc.gray(`    ... and ${updates.toUpdate.length - 10} more`));
  }
  if (updates.skipped.length > 0) {
    console.log(pc.yellow('  Will skip (modified locally):'));
    updates.skipped.slice(0, 5).forEach(f => console.log(pc.yellow(`    ~ ${f}`)));
    if (updates.skipped.length > 5) console.log(pc.gray(`    ... and ${updates.skipped.length - 5} more`));
  }
  console.log('');
  return promptConfirm('Apply these updates?', true);
}

export interface DiscordConfig {
  token: string;
  guildId?: string;
  autoSetup: boolean;
}

export async function promptDiscordSetup(): Promise<DiscordConfig> {
  console.log('');
  console.log(pc.cyan('━━━ Discord Bot Setup ━━━'));
  console.log(pc.gray('Get your bot token from: https://discord.com/developers/applications'));
  console.log('');

  const token = await p.password({
    message: 'Discord Bot Token:',
    mask: '*',
    validate: (value) => {
      if (!value || !value.trim()) return 'Bot token is required';
      if (value.length < 50) return 'Invalid token format';
    }
  });
  if (p.isCancel(token)) process.exit(0);

  const hasGuild = await p.confirm({
    message: 'Do you have a Discord Server ID to configure?',
    initialValue: false
  });
  if (p.isCancel(hasGuild)) process.exit(0);

  let guildId: string | undefined;
  if (hasGuild) {
    const guild = await p.text({
      message: 'Discord Server ID:',
      placeholder: '123456789012345678',
      validate: (value) => {
        if (!value || !value.trim()) return 'Server ID is required';
        if (!/^\d{17,20}$/.test(String(value))) return 'Invalid Server ID format (should be 17-20 digits)';
      }
    });
    if (p.isCancel(guild)) process.exit(0);
    guildId = guild as string;
  }

  const autoSetup = await p.confirm({
    message: 'Auto-setup OpenClaw config? (requires openclaw CLI)',
    initialValue: true
  });
  if (p.isCancel(autoSetup)) process.exit(0);

  return {
    token: token as string,
    guildId,
    autoSetup: autoSetup as boolean
  };
}
