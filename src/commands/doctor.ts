import fs from 'fs-extra';
import { join } from 'path';
import pc from 'picocolors';
import { isAkProject, resolveSource, TARGETS } from '../utils/paths.js';
import { loadState, createInitialState } from '../utils/state.js';

interface CheckResult {
  name: string;
  label: string;
  passed: boolean;
  severity: 'error' | 'warning';
  fixed?: boolean;
  fixError?: string;
  meta?: Record<string, any>;
}

interface Check {
  name: string;
  label: string;
  severity: 'error' | 'warning';
  check: () => boolean | Promise<boolean>;
  fix?: () => void | Promise<void>;
  getMeta?: () => Record<string, any> | Promise<Record<string, any>>;
}

export async function doctorCommand(options: Record<string, any> = {}): Promise<{ issues: number; warnings: number }> {
  const projectDir = process.cwd();

  // Detect target directory for use across checks
  let targetDir: { name: string; folder: string; dir: string } | null = null;
  for (const [name, folder] of Object.entries(TARGETS)) {
    const dir = join(projectDir, folder);
    if (fs.existsSync(dir)) {
      targetDir = { name, folder, dir };
      break;
    }
  }

  // Load state once
  let state = await loadState(projectDir);

  // Define all checks
  const checks: Check[] = [
    {
      name: 'project',
      label: 'ak project detected',
      severity: 'error',
      check: () => isAkProject(projectDir),
      fix: async () => {
        await fs.ensureDir(join(projectDir, '.ak'));
      }
    },
    {
      name: 'state',
      label: 'State file (.ak/state.json) exists',
      severity: 'warning',
      check: () => state !== null,
      fix: async () => {
        // Create state with detected values
        const kit = 'unknown';
        const source = '';
        const target = targetDir ? targetDir.folder : '.claude';

        // Detect installed components
        const installed: any = {};
        if (targetDir) {
          const dirs = ['agents', 'skills', 'commands', 'workflows'];
          for (const dir of dirs) {
            const fullPath = join(targetDir.dir, dir);
            if (fs.existsSync(fullPath)) {
              const items = fs.readdirSync(fullPath).filter(f => !f.startsWith('.'));
              if (items.length > 0) {
                installed[dir] = items;
              }
            }
          }
        }

        await createInitialState(projectDir, { kit, source, target, installed });
        state = await loadState(projectDir); // Reload state
      }
    },
    {
      name: 'target',
      label: 'Target directory exists',
      severity: 'error',
      check: () => targetDir !== null,
      getMeta: () => targetDir ? { folder: targetDir.folder } : {}
    },
    {
      name: 'agents_md',
      label: 'AGENTS.md exists',
      severity: 'warning',
      check: () => fs.existsSync(join(projectDir, 'AGENTS.md'))
    },
    {
      name: 'source',
      label: 'Source directory accessible',
      severity: 'error',
      check: () => {
        if (!state || !state.source) return true; // Skip if no state/source
        return fs.existsSync(state.source);
      },
      getMeta: () => state && state.source ? { source: state.source } : {}
    },
    {
      name: 'subdirs_agents',
      label: 'agents/ exists',
      severity: 'warning',
      check: () => {
        if (!targetDir) return false;
        return fs.existsSync(join(targetDir.dir, 'agents'));
      },
      fix: async () => {
        if (targetDir) {
          await fs.ensureDir(join(targetDir.dir, 'agents'));
        }
      },
      getMeta: () => {
        if (!targetDir) return {};
        const fullPath = join(targetDir.dir, 'agents');
        if (fs.existsSync(fullPath)) {
          const items = fs.readdirSync(fullPath).length;
          return { items };
        }
        return {};
      }
    },
    {
      name: 'subdirs_commands',
      label: 'commands/ exists',
      severity: 'warning',
      check: () => {
        if (!targetDir) return false;
        return fs.existsSync(join(targetDir.dir, 'commands'));
      },
      fix: async () => {
        if (targetDir) {
          await fs.ensureDir(join(targetDir.dir, 'commands'));
        }
      },
      getMeta: () => {
        if (!targetDir) return {};
        const fullPath = join(targetDir.dir, 'commands');
        if (fs.existsSync(fullPath)) {
          const items = fs.readdirSync(fullPath).length;
          return { items };
        }
        return {};
      }
    },
    {
      name: 'subdirs_skills',
      label: 'skills/ exists',
      severity: 'warning',
      check: () => {
        if (!targetDir) return false;
        return fs.existsSync(join(targetDir.dir, 'skills'));
      },
      fix: async () => {
        if (targetDir) {
          await fs.ensureDir(join(targetDir.dir, 'skills'));
        }
      },
      getMeta: () => {
        if (!targetDir) return {};
        const fullPath = join(targetDir.dir, 'skills');
        if (fs.existsSync(fullPath)) {
          const items = fs.readdirSync(fullPath).length;
          return { items };
        }
        return {};
      }
    },
    {
      name: 'subdirs_scripts',
      label: 'scripts/ exists',
      severity: 'warning',
      check: () => {
        if (!targetDir) return false;
        return fs.existsSync(join(targetDir.dir, 'scripts'));
      }
    },
    {
      name: 'subdirs_hooks',
      label: 'hooks/ exists',
      severity: 'warning',
      check: () => {
        if (!targetDir) return false;
        return fs.existsSync(join(targetDir.dir, 'hooks'));
      }
    },
    {
      name: 'statusline',
      label: 'statusline files exist',
      severity: 'warning',
      check: () => {
        if (!targetDir) return false;
        return fs.existsSync(join(targetDir.dir, 'statusline.cjs')) ||
               fs.existsSync(join(targetDir.dir, 'statusline.sh'));
      }
    }
  ];

  // Run checks
  const results = await runChecks(checks, options);

  // Handle output modes
  if (options.json) {
    await outputJson(projectDir, results);
    return computeSummary(results);
  }

  if (options.report) {
    await outputReport(projectDir, results, options);
  }

  if (options.checkOnly) {
    const summary = computeSummary(results);
    if (summary.issues > 0) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  }

  // Default colored output (backward compatible)
  await outputColored(projectDir, results, state, targetDir);

  return computeSummary(results);
}

async function runChecks(checks: Check[], options: Record<string, any>): Promise<CheckResult[]> {
  const results: CheckResult[] = [];

  for (const c of checks) {
    const passed = await c.check();
    const meta = c.getMeta ? await c.getMeta() : undefined;
    const result: CheckResult = {
      name: c.name,
      label: c.label,
      passed,
      severity: c.severity,
      meta
    };

    if (!passed && options.fix && c.fix) {
      try {
        await c.fix();
        result.fixed = true;
        result.passed = true;
      } catch (e: any) {
        result.fixError = e.message;
      }
    }

    results.push(result);
  }

  return results;
}

function computeSummary(results: CheckResult[]): { issues: number; warnings: number } {
  let issues = 0;
  let warnings = 0;

  for (const r of results) {
    if (!r.passed && r.severity === 'error') {
      issues++;
    }
    if (!r.passed && r.severity === 'warning') {
      warnings++;
    }
  }

  return { issues, warnings };
}

async function outputJson(projectDir: string, results: CheckResult[]): Promise<void> {
  const summary = computeSummary(results);
  const fixed = results.filter(r => r.fixed).length;

  const output = {
    project: projectDir,
    timestamp: new Date().toISOString(),
    checks: results,
    summary: {
      total: results.length,
      passed: results.filter(r => r.passed).length,
      failed: results.filter(r => !r.passed).length,
      warnings: summary.warnings,
      fixed
    }
  };

  console.log(JSON.stringify(output, null, 2));
}

async function outputReport(projectDir: string, results: CheckResult[], options: Record<string, any>): Promise<void> {
  const summary = computeSummary(results);
  const timestamp = new Date().toISOString();

  let markdown = `# Apero Kit Doctor Report\n\n`;
  markdown += `**Project:** ${projectDir}\n`;
  markdown += `**Timestamp:** ${timestamp}\n\n`;

  markdown += `## Summary\n\n`;
  markdown += `- Total checks: ${results.length}\n`;
  markdown += `- Passed: ${results.filter(r => r.passed).length}\n`;
  markdown += `- Failed: ${results.filter(r => !r.passed).length}\n`;
  markdown += `- Errors: ${summary.issues}\n`;
  markdown += `- Warnings: ${summary.warnings}\n`;
  if (options.fix) {
    markdown += `- Fixed: ${results.filter(r => r.fixed).length}\n`;
  }
  markdown += `\n`;

  markdown += `## Check Results\n\n`;
  for (const r of results) {
    const icon = r.passed ? '✓' : (r.severity === 'error' ? '✗' : '⚠');
    markdown += `### ${icon} ${r.label}\n\n`;
    markdown += `- **Status:** ${r.passed ? 'PASS' : 'FAIL'}\n`;
    markdown += `- **Severity:** ${r.severity}\n`;
    if (r.fixed) {
      markdown += `- **Fixed:** Yes\n`;
    }
    if (r.fixError) {
      markdown += `- **Fix Error:** ${r.fixError}\n`;
    }
    if (r.meta && Object.keys(r.meta).length > 0) {
      markdown += `- **Details:** ${JSON.stringify(r.meta)}\n`;
    }
    markdown += `\n`;
  }

  markdown += `## Suggestions\n\n`;
  const failedChecks = results.filter(r => !r.passed);
  if (failedChecks.length === 0) {
    markdown += `All checks passed! No suggestions.\n`;
  } else {
    for (const r of failedChecks) {
      if (r.name === 'project') {
        markdown += `- Run "ak init ." to initialize this directory\n`;
      }
      if (r.name === 'state') {
        markdown += `- State file is missing. Re-run "ak init" or create manually\n`;
      }
      if (r.name === 'source' && r.meta?.source) {
        markdown += `- Update source path: ak update --source <new-path>\n`;
      }
    }
  }

  const reportPath = join(projectDir, '.ak', 'doctor-report.md');
  await fs.ensureDir(join(projectDir, '.ak'));
  await fs.writeFile(reportPath, markdown, 'utf-8');

  if (!options.json) {
    console.log(pc.green(`\n✓ Report saved to ${reportPath}\n`));
  }
}

async function outputColored(
  projectDir: string,
  results: CheckResult[],
  state: any,
  targetDir: { name: string; folder: string; dir: string } | null
): Promise<void> {
  console.log(pc.bold(pc.cyan('\nApero Kit Doctor\n')));
  console.log(pc.gray('Checking project health...\n'));

  // Output each check result
  for (const r of results) {
    if (r.passed) {
      let msg = `✓ ${r.label}`;
      if (r.name === 'target' && r.meta?.folder) {
        msg += ` (${r.meta.folder})`;
      }
      if (r.name.startsWith('subdirs_') && r.meta?.items !== undefined) {
        msg += ` (${r.meta.items} items)`;
      }
      console.log(pc.green(msg));
    } else {
      const icon = r.severity === 'error' ? '✗' : '⚠';
      const color = r.severity === 'error' ? pc.red : pc.yellow;
      let msg = `${icon} ${r.label}`;
      if (r.name === 'target') {
        msg = `${icon} No target directory (.claude/, .opencode/, .agent/)`;
      }
      if (r.name === 'agents_md') {
        msg = `${icon} AGENTS.md not found (optional but recommended)`;
      }
      if (r.name === 'source' && r.meta?.source) {
        msg = `${icon} Source directory not found: ${r.meta.source}`;
      }
      if (r.name.startsWith('subdirs_')) {
        const dir = r.name.replace('subdirs_', '');
        msg = `${icon} ${dir}/ not found`;
      }
      console.log(color(msg));
    }
  }

  // Source detection (special formatting)
  console.log('');
  console.log(pc.gray('Source detection:'));
  const source = resolveSource();
  if ('error' in source) {
    console.log(pc.yellow(`  ⚠ ${source.error}`));
  } else {
    console.log(pc.green(`  ✓ Found source: ${source.path}`));
    console.log(pc.gray(`    Type: ${source.type || 'unknown'}`));
  }

  // Summary
  const summary = computeSummary(results);
  console.log('');
  console.log(pc.cyan('─'.repeat(40)));

  if (summary.issues === 0 && summary.warnings === 0) {
    console.log(pc.bold(pc.green('\n✓ All checks passed!\n')));
  } else if (summary.issues === 0) {
    console.log(pc.yellow(`\n⚠ ${summary.warnings} warning(s), no critical issues\n`));
  } else {
    console.log(pc.red(`\n✗ ${summary.issues} issue(s), ${summary.warnings} warning(s)\n`));
  }

  // Suggestions
  if (summary.issues > 0 || summary.warnings > 0) {
    console.log(pc.cyan('Suggestions:'));

    const isProject = results.find(r => r.name === 'project')?.passed;
    const hasState = results.find(r => r.name === 'state')?.passed;

    if (!isProject) {
      console.log(pc.white('  • Run "ak init ." to initialize this directory'));
    }

    if (!hasState && isProject) {
      console.log(pc.white('  • State file is missing. Re-run "ak init" or create manually'));
    }

    if (state && state.source && !fs.existsSync(state.source)) {
      console.log(pc.white('  • Update source path: ak update --source <new-path>'));
    }

    console.log('');
  }
}
