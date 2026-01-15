import chalk from 'chalk';
import { KITS, getKitList } from '../kits/index.js';
import { resolveSource } from '../utils/paths.js';
import { listAvailable } from '../utils/copy.js';

export async function listCommand(type, options = {}) {
  const validTypes = ['kits', 'agents', 'skills', 'commands', 'workflows'];

  // If no type specified, show help
  if (!type) {
    console.log(chalk.cyan('\nAvailable list commands:'));
    console.log(chalk.white('  ak list kits      - List available kits'));
    console.log(chalk.white('  ak list agents    - List available agents'));
    console.log(chalk.white('  ak list skills    - List available skills'));
    console.log(chalk.white('  ak list commands  - List available commands'));
    console.log(chalk.white('  ak list workflows - List available workflows'));
    console.log('');
    return;
  }

  // Normalize type
  type = type.toLowerCase();
  if (!validTypes.includes(type)) {
    console.log(chalk.red(`Unknown type: ${type}`));
    console.log(chalk.gray(`Valid types: ${validTypes.join(', ')}`));
    return;
  }

  // List kits (doesn't need source)
  if (type === 'kits') {
    listKits();
    return;
  }

  // For other types, need source
  const source = resolveSource(options.source);
  if (source.error) {
    console.log(chalk.red(`Error: ${source.error}`));
    return;
  }

  console.log(chalk.gray(`Source: ${source.path}\n`));

  switch (type) {
    case 'agents':
      listAgents(source.claudeDir);
      break;
    case 'skills':
      listSkills(source.claudeDir);
      break;
    case 'commands':
      listCommands(source.claudeDir);
      break;
    case 'workflows':
      listWorkflows(source.claudeDir);
      break;
  }
}

function listKits() {
  const kits = getKitList();

  console.log(chalk.cyan.bold('\nAvailable Kits:\n'));

  for (const kit of kits) {
    const colorFn = chalk[kit.color] || chalk.white;
    console.log(`  ${kit.emoji}  ${colorFn.bold(kit.name.padEnd(12))} - ${kit.description}`);

    // Show details
    if (Array.isArray(kit.agents)) {
      console.log(chalk.gray(`      Agents: ${kit.agents.length} | Skills: ${kit.skills.length} | Commands: ${kit.commands.length}`));
    } else {
      console.log(chalk.gray('      Includes: ALL agents, skills, commands'));
    }
  }

  console.log(`\n  🔧  ${chalk.bold('custom'.padEnd(12))} - Pick your own agents, skills, and commands`);
  console.log('');
}

function listAgents(sourceDir) {
  const agents = listAvailable('agents', sourceDir);

  console.log(chalk.cyan.bold(`Available Agents (${agents.length}):\n`));

  if (agents.length === 0) {
    console.log(chalk.gray('  No agents found'));
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
        line += chalk.white(agents[idx].name.padEnd(25));
      }
    }
    console.log(line);
  }
  console.log('');
}

function listSkills(sourceDir) {
  const skills = listAvailable('skills', sourceDir).filter(s => s.isDir);

  console.log(chalk.cyan.bold(`Available Skills (${skills.length}):\n`));

  if (skills.length === 0) {
    console.log(chalk.gray('  No skills found'));
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
        line += chalk.white(skills[idx].name.padEnd(35));
      }
    }
    console.log(line);
  }
  console.log('');
}

function listCommands(sourceDir) {
  const commands = listAvailable('commands', sourceDir);

  console.log(chalk.cyan.bold(`Available Commands (${commands.length}):\n`));

  if (commands.length === 0) {
    console.log(chalk.gray('  No commands found'));
    return;
  }

  // Separate files and directories
  const files = commands.filter(c => !c.isDir);
  const dirs = commands.filter(c => c.isDir);

  // Print main commands (files)
  console.log(chalk.gray('  Main commands:'));
  const cols = 4;
  let rows = Math.ceil(files.length / cols);

  for (let i = 0; i < rows; i++) {
    let line = '    ';
    for (let j = 0; j < cols; j++) {
      const idx = i + j * rows;
      if (idx < files.length) {
        line += chalk.white(('/' + files[idx].name).padEnd(18));
      }
    }
    console.log(line);
  }

  // Print command groups (directories)
  if (dirs.length > 0) {
    console.log(chalk.gray('\n  Command groups:'));
    for (const dir of dirs) {
      console.log(chalk.yellow(`    /${dir.name}/`));
    }
  }

  console.log('');
}

function listWorkflows(sourceDir) {
  const workflows = listAvailable('workflows', sourceDir);

  console.log(chalk.cyan.bold(`Available Workflows (${workflows.length}):\n`));

  if (workflows.length === 0) {
    console.log(chalk.gray('  No workflows found'));
    return;
  }

  for (const wf of workflows) {
    console.log(chalk.white(`  • ${wf.name}`));
  }
  console.log('');
}
