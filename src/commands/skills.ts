import pc from 'picocolors';
import fs from 'fs-extra';
import { join } from 'path';
import * as p from '@clack/prompts';
import { resolveSource } from '../utils/paths.js';
import { listAvailable } from '../utils/copy.js';

// Map agent types to their skill directories
const AGENT_SKILL_PATHS: Record<string, string> = {
  claude: '.claude/skills',
  cursor: '.cursor/rules',
  codex: '.codex/skills',
};

export async function skillsCommand(options: Record<string, any>): Promise<void> {
  const { name, agent, list, installed, uninstall, yes } = options;

  // List mode - show available skills with installation status
  if (list || (!name && !installed)) {
    await listSkillsWithStatus();
    return;
  }

  // Show installed skills only
  if (installed && !name) {
    await showInstalledSkills();
    return;
  }

  // Install or uninstall mode requires skill name
  if (!name) {
    console.log(pc.red('Error: --name <skill> is required'));
    console.log(pc.gray('Usage: ak skills --name <skill> [--agent <agents>] [--uninstall]'));
    process.exit(1);
  }

  // Parse target agents (default: claude)
  const targetAgents = parseAgents(agent);

  // Uninstall mode
  if (uninstall) {
    await uninstallSkill(name, targetAgents, yes);
    return;
  }

  // Install mode
  await installSkill(name, targetAgents, yes);
}

/**
 * List all available skills with installation status per agent
 */
async function listSkillsWithStatus(): Promise<void> {
  const source = resolveSource();
  if ('error' in source) {
    console.log(pc.red(`Error: ${source.error}`));
    process.exit(1);
  }

  const skills = listAvailable('skills', source.claudeDir).filter(s => s.isDir);

  if (skills.length === 0) {
    console.log(pc.yellow('No skills found in source'));
    return;
  }

  console.log(pc.bold(pc.cyan(`\nAvailable Skills (${skills.length}):`)));
  console.log(pc.gray(`Source: ${source.path}\n`));

  // Header
  const header = '  Skill'.padEnd(40) + 'Claude  Cursor  Codex';
  console.log(pc.bold(header));
  console.log(pc.gray('  ' + '─'.repeat(58)));

  // List each skill with installation status
  for (const skill of skills) {
    const claudeInstalled = isSkillInstalled(skill.name, 'claude');
    const cursorInstalled = isSkillInstalled(skill.name, 'cursor');
    const codexInstalled = isSkillInstalled(skill.name, 'codex');

    const statusLine =
      '  ' +
      skill.name.padEnd(38) +
      (claudeInstalled ? pc.green('✓') : pc.gray('-')).padEnd(8) +
      (cursorInstalled ? pc.green('✓') : pc.gray('-')).padEnd(8) +
      (codexInstalled ? pc.green('✓') : pc.gray('-'));

    console.log(statusLine);
  }

  console.log('');
  console.log(pc.gray('Install: ak skills --name <skill> --agent <claude|cursor|codex>'));
  console.log('');
}

/**
 * Show only installed skills
 */
async function showInstalledSkills(): Promise<void> {
  console.log(pc.bold(pc.cyan('\nInstalled Skills:\n')));

  let hasAny = false;

  for (const [agentType, skillPath] of Object.entries(AGENT_SKILL_PATHS)) {
    const installed = getInstalledSkills(agentType);
    if (installed.length > 0) {
      hasAny = true;
      console.log(pc.bold(`  ${agentType}:`));
      for (const skill of installed) {
        console.log(pc.white(`    • ${skill}`));
      }
      console.log('');
    }
  }

  if (!hasAny) {
    console.log(pc.gray('  No skills installed'));
    console.log('');
  }
}

/**
 * Install a skill to target agents
 */
async function installSkill(skillName: string, agents: string[], skipConfirm: boolean): Promise<void> {
  const source = resolveSource();
  if ('error' in source) {
    console.log(pc.red(`Error: ${source.error}`));
    process.exit(1);
  }

  // Find skill in source
  const skillPath = join(source.claudeDir, 'skills', skillName);
  if (!fs.existsSync(skillPath)) {
    console.log(pc.red(`Error: Skill "${skillName}" not found in source`));
    console.log(pc.gray(`Available skills: ak skills --list`));
    process.exit(1);
  }

  // Confirm installation unless --yes
  if (!skipConfirm) {
    const confirm = await p.confirm({
      message: `Install skill "${skillName}" to ${agents.join(', ')}?`,
    });

    if (p.isCancel(confirm) || !confirm) {
      console.log(pc.gray('Cancelled'));
      process.exit(0);
    }
  }

  // Install to each agent
  const results: Array<{ agent: string; success: boolean; error?: string }> = [];

  for (const agent of agents) {
    try {
      const targetPath = join(process.cwd(), AGENT_SKILL_PATHS[agent], skillName);

      // Ensure target directory exists
      await fs.ensureDir(join(process.cwd(), AGENT_SKILL_PATHS[agent]));

      // Copy skill directory
      await fs.copy(skillPath, targetPath, { overwrite: true });

      results.push({ agent, success: true });
    } catch (err: any) {
      results.push({ agent, success: false, error: err.message });
    }
  }

  // Report results
  console.log('');
  const allSuccess = results.every(r => r.success);

  if (allSuccess) {
    console.log(pc.green(`✓ Installed "${skillName}" to ${agents.join(', ')}`));
  } else {
    for (const result of results) {
      if (result.success) {
        console.log(pc.green(`✓ ${result.agent}: installed`));
      } else {
        console.log(pc.red(`✗ ${result.agent}: ${result.error}`));
      }
    }
  }
  console.log('');
}

/**
 * Uninstall a skill from target agents
 */
async function uninstallSkill(skillName: string, agents: string[], skipConfirm: boolean): Promise<void> {
  // Check if skill is installed in any target agent
  const installedIn = agents.filter(agent => isSkillInstalled(skillName, agent));

  if (installedIn.length === 0) {
    console.log(pc.yellow(`Skill "${skillName}" is not installed in ${agents.join(', ')}`));
    process.exit(0);
  }

  // Confirm removal unless --yes
  if (!skipConfirm) {
    const confirm = await p.confirm({
      message: `Uninstall skill "${skillName}" from ${installedIn.join(', ')}?`,
    });

    if (p.isCancel(confirm) || !confirm) {
      console.log(pc.gray('Cancelled'));
      process.exit(0);
    }
  }

  // Remove from each agent
  const results: Array<{ agent: string; success: boolean; error?: string }> = [];

  for (const agent of installedIn) {
    try {
      const targetPath = join(process.cwd(), AGENT_SKILL_PATHS[agent], skillName);
      await fs.remove(targetPath);
      results.push({ agent, success: true });
    } catch (err: any) {
      results.push({ agent, success: false, error: err.message });
    }
  }

  // Report results
  console.log('');
  const allSuccess = results.every(r => r.success);

  if (allSuccess) {
    console.log(pc.green(`✓ Uninstalled "${skillName}" from ${installedIn.join(', ')}`));
  } else {
    for (const result of results) {
      if (result.success) {
        console.log(pc.green(`✓ ${result.agent}: uninstalled`));
      } else {
        console.log(pc.red(`✗ ${result.agent}: ${result.error}`));
      }
    }
  }
  console.log('');
}

/**
 * Parse agent flag into array (comma-separated, defaults to claude)
 */
function parseAgents(agentFlag?: string): string[] {
  if (!agentFlag) {
    return ['claude'];
  }

  const agents = agentFlag.split(',').map(a => a.trim().toLowerCase());
  const valid = agents.filter(a => a in AGENT_SKILL_PATHS);

  if (valid.length === 0) {
    console.log(pc.red('Error: No valid agents specified'));
    console.log(pc.gray('Valid agents: claude, cursor, codex'));
    process.exit(1);
  }

  return valid;
}

/**
 * Check if skill is installed for an agent
 */
function isSkillInstalled(skillName: string, agent: string): boolean {
  const skillPath = join(process.cwd(), AGENT_SKILL_PATHS[agent], skillName);
  return fs.existsSync(skillPath);
}

/**
 * Get list of installed skills for an agent
 */
function getInstalledSkills(agent: string): string[] {
  const skillsDir = join(process.cwd(), AGENT_SKILL_PATHS[agent]);

  if (!fs.existsSync(skillsDir)) {
    return [];
  }

  try {
    const items = fs.readdirSync(skillsDir);
    return items.filter(item => {
      const itemPath = join(skillsDir, item);
      return fs.statSync(itemPath).isDirectory();
    });
  } catch {
    return [];
  }
}
