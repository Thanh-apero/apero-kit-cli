# Phase 6: Enhanced Doctor Command

## Context
AK-CLI doctor has --fix, --report, --json, --check-only. Current `ak doctor` only runs checks and prints results -- no fix capability, no machine-readable output.

## Overview
Extend existing `doctorCommand` with 4 new flags. Refactor checks into structured array for easier iteration and fix mapping.

## Requirements
- `--fix` -- auto-fix common issues (create missing dirs, regenerate state)
- `--report` -- generate markdown diagnostic report to file
- `--json` -- output results as JSON (for CI/scripts)
- `--check-only` -- exit code 1 if any issues (CI mode, no suggestions)

## Related Files
- `src/commands/doctor.js` -- main file to modify (129 lines)
- `bin/ak.js` -- add options to doctor command (line 73-76)

## Architecture

Refactor checks into structured format:
```js
const checks = [
  {
    name: 'ak-project',
    label: 'ak project detected',
    check: () => isAkProject(projectDir),
    severity: 'error', // error | warning
    fix: null, // or async function
  },
  {
    name: 'state-file',
    label: 'State file exists',
    check: () => fs.existsSync(join(projectDir, '.ak', 'state.json')),
    severity: 'warning',
    fix: async () => { /* regenerate state */ },
  },
  // ... more checks
];
```

## Implementation Steps

### Step 1: Register new options in bin/ak.js
```js
program
  .command('doctor')
  .description('Check project health and diagnose issues')
  .option('--fix', 'Auto-fix common issues')
  .option('--report', 'Generate diagnostic report file')
  .option('--json', 'Output as JSON')
  .option('--check-only', 'Exit code 1 on failure (CI mode)')
  .action(doctorCommand);
```

### Step 2: Refactor checks into array
Replace current sequential checks with structured array. Each check object has: `name`, `label`, `check()` (returns bool), `severity`, `fix()` (optional async fn).

### Step 3: Implement check runner
```js
async function runChecks(checks, options) {
  const results = [];
  for (const c of checks) {
    const passed = await c.check();
    const result = { name: c.name, label: c.label, passed, severity: c.severity };

    if (!passed && options.fix && c.fix) {
      try {
        await c.fix();
        result.fixed = true;
        result.passed = true;
      } catch (e) {
        result.fixError = e.message;
      }
    }
    results.push(result);
  }
  return results;
}
```

### Step 4: Implement --json output
```js
if (options.json) {
  const output = {
    project: projectDir,
    timestamp: new Date().toISOString(),
    checks: results,
    summary: { total, passed, failed, warnings, fixed }
  };
  console.log(JSON.stringify(output, null, 2));
  return;
}
```

### Step 5: Implement --report
```js
if (options.report) {
  const reportPath = join(projectDir, '.ak', 'doctor-report.md');
  const content = generateReport(results, projectDir);
  await fs.writeFile(reportPath, content);
  console.log(chalk.green(`Report saved: ${reportPath}`));
}
```

### Step 6: Implement --check-only
```js
if (options.checkOnly) {
  const hasIssues = results.some(r => !r.passed && r.severity === 'error');
  process.exit(hasIssues ? 1 : 0);
}
```

### Step 7: Define fix functions
- Missing .ak/ dir → `fs.ensureDir`
- Missing state.json → `createInitialState` with detected values
- Missing target subdirs → `fs.ensureDir` for agents/, skills/, commands/
- Stale cache → re-fetch remote templates

## Todo List
- [ ] Add options to doctor command in bin/ak.js
- [ ] Refactor checks into structured array
- [ ] Implement check runner with fix support
- [ ] Implement --json output
- [ ] Implement --report markdown generation
- [ ] Implement --check-only exit code
- [ ] Add fix functions for common issues
- [ ] Test: `ak doctor --json | jq .summary`
- [ ] Test: `ak doctor --fix`
- [ ] Test: `ak doctor --check-only` (CI exit code)

## Success Criteria
- `ak doctor --json` outputs valid JSON with all check results
- `ak doctor --fix` auto-fixes at least: missing dirs, missing state file
- `ak doctor --check-only` returns exit code 1 when issues exist
- `ak doctor --report` generates .ak/doctor-report.md
- Backward compatible: `ak doctor` (no flags) works identically to current behavior

## Risk Assessment
- **--fix is destructive**: Only fix safe operations (create dirs, regenerate state). Never delete files.
- **Backward compatibility**: Ensure no-flag behavior unchanged. Tests should verify.

## Security Considerations
- --report only writes to project directory (.ak/)
- --fix never executes external commands
