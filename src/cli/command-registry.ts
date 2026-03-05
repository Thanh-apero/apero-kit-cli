import type { CAC } from 'cac';

export function registerCommands(cli: CAC): void {
  // init
  cli
    .command('init [project-name]', 'Initialize a new project with an agent kit')
    .option('-k, --kit <type>', 'Kit type (engineer, researcher, designer, minimal, full, custom)')
    .option('-t, --target <target>', 'Target CLI (claude, gemini, discord or combination)')
    .option('-s, --source <path>', 'Custom source path for templates')
    .option('-f, --force', 'Overwrite existing directory')
    .option('-g, --global', 'Install to global ~/.claude/ directory')
    .option('--fresh', 'Remove existing installation before re-init')
    .option('-y, --yes', 'Skip prompts, use defaults')
    .option('-p, --password <code>', 'Access code for initialization')
    .option('--exclude <patterns>', 'Exclude components (comma-separated)')
    .option('--only <patterns>', 'Include only matching components (comma-separated)')
    .action(async (projectName: string | undefined, options: Record<string, any>) => {
      const { initCommand } = await import('../commands/init.js');
      await initCommand(projectName, options);
    });

  // add
  cli
    .command('add <item>', 'Add agent, skill, or command (e.g., tk add skill:databases)')
    .option('-s, --source <path>', 'Custom source path')
    .option('-p, --path <path>', 'Target project path')
    .action(async (item: string, options: Record<string, any>) => {
      const { addCommand } = await import('../commands/add.js');
      await addCommand(item, options);
    });

  // list
  cli
    .command('list [type]', 'List available kits, agents, skills, or commands')
    .option('-s, --source <path>', 'Custom source path')
    .action(async (type: string | undefined, options: Record<string, any>) => {
      const { listCommand } = await import('../commands/list.js');
      await listCommand(type, options);
    });

  // update (template sync)
  cli
    .command('update', 'Update/sync from source templates')
    .option('-s, --source <path>', 'Source path to sync from')
    .option('--agents', 'Update only agents')
    .option('--skills', 'Update only skills')
    .option('--commands', 'Update only commands')
    .option('--all', 'Update everything')
    .option('-n, --dry-run', 'Show what would be updated without making changes')
    .option('-f, --force', 'Force update without confirmation')
    .action(async (options: Record<string, any>) => {
      const { updateCommand } = await import('../commands/update.js');
      await updateCommand(options);
    });

  // status
  cli
    .command('status', 'Show project status and file changes')
    .option('-v, --verbose', 'Show all files')
    .action(async (options: Record<string, any>) => {
      const { statusCommand } = await import('../commands/status.js');
      await statusCommand(options);
    });

  // doctor
  cli
    .command('doctor', 'Check project health and diagnose issues')
    .option('--fix', 'Auto-fix common issues')
    .option('--report', 'Generate diagnostic report')
    .option('--json', 'Output JSON format')
    .option('--check-only', 'CI mode: exit 1 on failures')
    .action(async (options: Record<string, any>) => {
      const { doctorCommand } = await import('../commands/doctor.js');
      await doctorCommand(options);
    });

  // kits alias
  cli
    .command('kits', 'List all available kits')
    .action(async () => {
      const { listCommand } = await import('../commands/list.js');
      await listCommand('kits', {});
    });

  // help - open docs
  cli
    .command('help', 'Open interactive help documentation in browser')
    .option('-s, --source <path>', 'Custom source path')
    .action(async (options: Record<string, any>) => {
      const { helpCommand } = await import('../commands/help.js');
      await helpCommand(options);
    });

  // uninstall
  cli
    .command('uninstall', 'Remove ClaudeKit installations')
    .option('-y, --yes', 'Skip confirmation')
    .option('-l, --local', 'Uninstall only local installation')
    .option('-g, --global', 'Uninstall only global installation')
    .option('--dry-run', 'Preview what would be removed')
    .action(async (options: Record<string, any>) => {
      const { uninstallCommand } = await import('../commands/uninstall.js');
      await uninstallCommand(options);
    });

  // versions
  cli
    .command('versions', 'List available versions')
    .option('--kit <kit>', 'Filter by kit')
    .option('--limit <limit>', 'Number of versions to show')
    .option('--all', 'Show all including prereleases')
    .action(async (options: Record<string, any>) => {
      const { versionsCommand } = await import('../commands/versions.js');
      await versionsCommand(options);
    });

  // update-cli
  cli
    .command('update-cli', 'Update the CLI itself to latest version')
    .option('--check', 'Check for updates without installing')
    .option('--version <version>', 'Update to specific version')
    .option('-f, --force', 'Force reinstall even if already up to date')
    .action(async (options: Record<string, any>) => {
      const { updateCliCommand } = await import('../commands/update-cli.js');
      await updateCliCommand(options);
    });

  // skills
  cli
    .command('skills', 'Manage skills across coding agents')
    .option('-n, --name <skill>', 'Skill name')
    .option('-a, --agent <agents>', 'Target agents')
    .option('-l, --list', 'List available skills')
    .option('--installed', 'Show installed skills')
    .option('-u, --uninstall', 'Uninstall skill')
    .option('-y, --yes', 'Skip confirmation')
    .action(async (options: Record<string, any>) => {
      const { skillsCommand } = await import('../commands/skills.js');
      await skillsCommand(options);
    });
}
