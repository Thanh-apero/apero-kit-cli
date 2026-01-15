#!/usr/bin/env node

import { program } from 'commander';
import chalk from 'chalk';
import { initCommand } from '../src/commands/init.js';
import { addCommand } from '../src/commands/add.js';
import { listCommand } from '../src/commands/list.js';
import { updateCommand } from '../src/commands/update.js';
import { statusCommand } from '../src/commands/status.js';
import { doctorCommand } from '../src/commands/doctor.js';

const VERSION = '1.0.0';

console.log(chalk.cyan.bold('\n  Apero Kit CLI') + chalk.gray(` v${VERSION}\n`));

program
  .name('ak')
  .description('Scaffold AI agent projects with pre-configured kits')
  .version(VERSION);

// ak init [project-name] --kit <kit-type>
program
  .command('init [project-name]')
  .description('Initialize a new project with an agent kit')
  .option('-k, --kit <type>', 'Kit type (engineer, researcher, designer, minimal, full, custom)')
  .option('-t, --target <target>', 'Target folder (claude, opencode, generic)', 'claude')
  .option('-s, --source <path>', 'Custom source path for templates')
  .option('-f, --force', 'Overwrite existing directory')
  .action(initCommand);

// ak add <type>:<name>
program
  .command('add <item>')
  .description('Add agent, skill, or command (e.g., ak add skill:databases)')
  .option('-s, --source <path>', 'Custom source path')
  .option('-p, --path <path>', 'Target project path', '.')
  .action(addCommand);

// ak list [type]
program
  .command('list [type]')
  .description('List available kits, agents, skills, or commands')
  .option('-s, --source <path>', 'Custom source path')
  .action(listCommand);

// ak update
program
  .command('update')
  .description('Update/sync from source templates')
  .option('-s, --source <path>', 'Source path to sync from')
  .option('--agents', 'Update only agents')
  .option('--skills', 'Update only skills')
  .option('--commands', 'Update only commands')
  .option('--all', 'Update everything')
  .option('-n, --dry-run', 'Show what would be updated without making changes')
  .option('-f, --force', 'Force update without confirmation')
  .action(updateCommand);

// ak status
program
  .command('status')
  .description('Show project status and file changes')
  .option('-v, --verbose', 'Show all files')
  .action(statusCommand);

// ak doctor
program
  .command('doctor')
  .description('Check project health and diagnose issues')
  .action(doctorCommand);

// ak kits - alias
program
  .command('kits')
  .description('List all available kits')
  .action(() => listCommand('kits'));

program.parse();
