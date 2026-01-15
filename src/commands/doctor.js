import fs from 'fs-extra';
import { join } from 'path';
import chalk from 'chalk';
import { isAkProject, resolveSource, TARGETS } from '../utils/paths.js';
import { loadState } from '../utils/state.js';

export async function doctorCommand(options = {}) {
  const projectDir = process.cwd();

  console.log(chalk.cyan.bold('\nApero Kit Doctor\n'));
  console.log(chalk.gray('Checking project health...\n'));

  let issues = 0;
  let warnings = 0;

  // Check 1: Is this an ak project?
  const isProject = isAkProject(projectDir);
  if (isProject) {
    console.log(chalk.green('✓ ak project detected'));
  } else {
    console.log(chalk.red('✗ Not an ak project'));
    issues++;
  }

  // Check 2: State file
  const state = await loadState(projectDir);
  if (state) {
    console.log(chalk.green('✓ State file (.ak/state.json) exists'));
  } else if (isProject) {
    console.log(chalk.yellow('⚠ No state file - project may have been created manually'));
    warnings++;
  }

  // Check 3: Target directory
  let targetDir = null;
  for (const [name, folder] of Object.entries(TARGETS)) {
    const dir = join(projectDir, folder);
    if (fs.existsSync(dir)) {
      targetDir = { name, folder, dir };
      break;
    }
  }

  if (targetDir) {
    console.log(chalk.green(`✓ Target directory exists (${targetDir.folder})`));
  } else {
    console.log(chalk.red('✗ No target directory (.claude/, .opencode/, .agent/)'));
    issues++;
  }

  // Check 4: AGENTS.md
  const agentsMd = join(projectDir, 'AGENTS.md');
  if (fs.existsSync(agentsMd)) {
    console.log(chalk.green('✓ AGENTS.md exists'));
  } else {
    console.log(chalk.yellow('⚠ AGENTS.md not found (optional but recommended)'));
    warnings++;
  }

  // Check 5: Source availability
  if (state && state.source) {
    if (fs.existsSync(state.source)) {
      console.log(chalk.green(`✓ Source directory accessible`));
    } else {
      console.log(chalk.red(`✗ Source directory not found: ${state.source}`));
      issues++;
    }
  }

  // Check 6: Key subdirectories
  if (targetDir) {
    const checkDirs = ['agents', 'commands', 'skills'];
    for (const dir of checkDirs) {
      const fullPath = join(targetDir.dir, dir);
      if (fs.existsSync(fullPath)) {
        const items = fs.readdirSync(fullPath).length;
        console.log(chalk.green(`✓ ${dir}/ exists (${items} items)`));
      } else {
        console.log(chalk.yellow(`⚠ ${dir}/ not found`));
        warnings++;
      }
    }
  }

  // Check 7: Auto-detect source in parent directories
  console.log('');
  console.log(chalk.gray('Source detection:'));
  const source = resolveSource();
  if (source.error) {
    console.log(chalk.yellow(`  ⚠ ${source.error}`));
    warnings++;
  } else {
    console.log(chalk.green(`  ✓ Found source: ${source.path}`));
    console.log(chalk.gray(`    Type: ${source.type || 'unknown'}`));
  }

  // Summary
  console.log('');
  console.log(chalk.cyan('─'.repeat(40)));

  if (issues === 0 && warnings === 0) {
    console.log(chalk.green.bold('\n✓ All checks passed!\n'));
  } else if (issues === 0) {
    console.log(chalk.yellow(`\n⚠ ${warnings} warning(s), no critical issues\n`));
  } else {
    console.log(chalk.red(`\n✗ ${issues} issue(s), ${warnings} warning(s)\n`));
  }

  // Suggestions
  if (issues > 0 || warnings > 0) {
    console.log(chalk.cyan('Suggestions:'));

    if (!isProject) {
      console.log(chalk.white('  • Run "ak init ." to initialize this directory'));
    }

    if (!state && isProject) {
      console.log(chalk.white('  • State file is missing. Re-run "ak init" or create manually'));
    }

    if (state && state.source && !fs.existsSync(state.source)) {
      console.log(chalk.white('  • Update source path: ak update --source <new-path>'));
    }

    console.log('');
  }

  return { issues, warnings };
}
