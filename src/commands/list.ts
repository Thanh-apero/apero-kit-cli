import pc from 'picocolors';
import { getKitList } from '../kits/index.js';
import { resolveSource } from '../utils/paths.js';
import { listAvailable, type AvailableItem } from '../utils/copy.js';

export async function listCommand(type: string | undefined, options: Record<string, any> = {}): Promise<void> {
  const validTypes = ['kits', 'agents', 'skills', 'commands', 'workflows'];

  // If no type specified, show help
  if (!type) {
    console.log(pc.cyan('\nAvailable list commands:'));
    console.log(pc.white('  ak list kits      - List available kits'));
    console.log(pc.white('  ak list agents    - List available agents'));
    console.log(pc.white('  ak list skills    - List available skills'));
    console.log(pc.white('  ak list commands  - List available commands'));
    console.log(pc.white('  ak list workflows - List available workflows'));
    console.log('');
    return;
  }

  // Normalize type
  type = type.toLowerCase();
  if (!validTypes.includes(type)) {
    console.log(pc.red(`Unknown type: ${type}`));
    console.log(pc.gray(`Valid types: ${validTypes.join(', ')}`));
    return;
  }

  // List kits (doesn't need source)
  if (type === 'kits') {
    listKits();
    return;
  }

  // For other types, need source
  const source = resolveSource(options.source);
  if ('error' in source) {
    console.log(pc.red(`Error: ${source.error}`));
    return;
  }

  console.log(pc.gray(`Source: ${source.path}\n`));

  switch (type) {
    case 'agents':
      listAgents(source.claudeDir);
      break;
    case 'skills':
      listSkills(source.claudeDir);
      break;
    case 'commands':
      listCommandsList(source.claudeDir);
      break;
    case 'workflows':
      listWorkflows(source.claudeDir);
      break;
  }
}

function listKits(): void {
  const kits = getKitList();

  console.log(pc.bold(pc.cyan('\nAvailable Kits:\n')));

  for (const kit of kits) {
    const colorFn = (pc as any)[kit.color] || pc.white;
    console.log(`  ${kit.emoji}  ${colorFn(pc.bold(kit.name.padEnd(12)))} - ${kit.description}`);

    // Show details
    if (Array.isArray(kit.agents)) {
      const agentCount = Array.isArray(kit.agents) ? kit.agents.length : 'all';
      const skillCount = Array.isArray(kit.skills) ? kit.skills.length : 'all';
      const cmdCount = Array.isArray(kit.commands) ? kit.commands.length : 'all';
      console.log(pc.gray(`      Agents: ${agentCount} | Skills: ${skillCount} | Commands: ${cmdCount}`));
    } else {
      console.log(pc.gray('      Includes: ALL agents, skills, commands'));
    }
  }

  console.log(`\n  🔧  ${pc.bold('custom'.padEnd(12))} - Pick your own agents, skills, and commands`);
  console.log('');
}

function listAgents(sourceDir: string): void {
  const agents = listAvailable('agents', sourceDir);

  console.log(pc.bold(pc.cyan(`Available Agents (${agents.length}):\n`)));

  if (agents.length === 0) {
    console.log(pc.gray('  No agents found'));
    return;
  }

  // Group into columns
  const cols = 3;
  const rows = Math.ceil(agents.length / cols);

  for (let i = 0; i < rows; i++) {
    let line = '  ';
    for (let j = 0; j < cols; j++) {
      const idx = i + j * rows;
      if (idx < agents.length) {
        line += pc.white(agents[idx].name.padEnd(25));
      }
    }
    console.log(line);
  }
  console.log('');
}

function listSkills(sourceDir: string): void {
  const skills = listAvailable('skills', sourceDir).filter(s => s.isDir);

  console.log(pc.bold(pc.cyan(`Available Skills (${skills.length}):\n`)));

  if (skills.length === 0) {
    console.log(pc.gray('  No skills found'));
    return;
  }

  // Group into columns
  const cols = 2;
  const rows = Math.ceil(skills.length / cols);

  for (let i = 0; i < rows; i++) {
    let line = '  ';
    for (let j = 0; j < cols; j++) {
      const idx = i + j * rows;
      if (idx < skills.length) {
        line += pc.white(skills[idx].name.padEnd(35));
      }
    }
    console.log(line);
  }
  console.log('');
}

function listCommandsList(sourceDir: string): void {
  const commands = listAvailable('commands', sourceDir);

  console.log(pc.bold(pc.cyan(`Available Commands (${commands.length}):\n`)));

  if (commands.length === 0) {
    console.log(pc.gray('  No commands found'));
    return;
  }

  // Separate files and directories
  const files = commands.filter(c => !c.isDir);
  const dirs = commands.filter(c => c.isDir);

  // Print main commands (files)
  console.log(pc.gray('  Main commands:'));
  const cols = 4;
  const rows = Math.ceil(files.length / cols);

  for (let i = 0; i < rows; i++) {
    let line = '    ';
    for (let j = 0; j < cols; j++) {
      const idx = i + j * rows;
      if (idx < files.length) {
        line += pc.white(('/' + files[idx].name).padEnd(18));
      }
    }
    console.log(line);
  }

  // Print command groups (directories)
  if (dirs.length > 0) {
    console.log(pc.gray('\n  Command groups:'));
    for (const dir of dirs) {
      console.log(pc.yellow(`    /${dir.name}/`));
    }
  }

  console.log('');
}

function listWorkflows(sourceDir: string): void {
  const workflows = listAvailable('workflows', sourceDir);

  console.log(pc.bold(pc.cyan(`Available Workflows (${workflows.length}):\n`)));

  if (workflows.length === 0) {
    console.log(pc.gray('  No workflows found'));
    return;
  }

  for (const wf of workflows) {
    console.log(pc.white(`  • ${wf.name}`));
  }
  console.log('');
}
