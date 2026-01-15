import { fileURLToPath } from 'url';
import { dirname, join, resolve } from 'path';
import { existsSync, statSync } from 'fs';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// CLI root directory
export const CLI_ROOT = resolve(__dirname, '../..');

// Target folder mappings
export const TARGETS = {
  claude: '.claude',
  opencode: '.opencode',
  generic: '.agent'
};

/**
 * Find source directory by traversing up from cwd
 * Algorithm: cwd → parent → git root
 * Looks for: AGENTS.md file or .claude/ directory
 */
export function findSource(startDir = process.cwd()) {
  let current = resolve(startDir);
  const root = getGitRoot(current) || '/';

  while (current !== root && current !== '/') {
    // Check for AGENTS.md file
    const agentsMd = join(current, 'AGENTS.md');
    if (existsSync(agentsMd) && statSync(agentsMd).isFile()) {
      // Found AGENTS.md, check for .claude/ in same directory
      const claudeDir = join(current, '.claude');
      if (existsSync(claudeDir) && statSync(claudeDir).isDirectory()) {
        return {
          path: current,
          type: 'agents-repo',
          claudeDir,
          agentsMd
        };
      }
    }

    // Check for standalone .claude/ directory
    const claudeDir = join(current, '.claude');
    if (existsSync(claudeDir) && statSync(claudeDir).isDirectory()) {
      return {
        path: current,
        type: 'claude-only',
        claudeDir,
        agentsMd: null
      };
    }

    // Check for .opencode/ as fallback
    const opencodeDir = join(current, '.opencode');
    if (existsSync(opencodeDir) && statSync(opencodeDir).isDirectory()) {
      return {
        path: current,
        type: 'opencode',
        claudeDir: opencodeDir,
        agentsMd: existsSync(join(current, 'AGENTS.md')) ? join(current, 'AGENTS.md') : null
      };
    }

    current = dirname(current);
  }

  // Check git root as final attempt
  if (root && root !== '/') {
    const claudeDir = join(root, '.claude');
    if (existsSync(claudeDir)) {
      return {
        path: root,
        type: 'git-root',
        claudeDir,
        agentsMd: existsSync(join(root, 'AGENTS.md')) ? join(root, 'AGENTS.md') : null
      };
    }
  }

  return null;
}

/**
 * Get git root directory
 */
export function getGitRoot(startDir = process.cwd()) {
  try {
    const result = execSync('git rev-parse --show-toplevel', {
      cwd: startDir,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe']
    });
    return result.trim();
  } catch {
    return null;
  }
}

/**
 * Check if current directory is an ak project
 */
export function isAkProject(dir = process.cwd()) {
  const akConfig = join(dir, '.ak', 'state.json');
  const claudeDir = join(dir, '.claude');
  const opencodeDir = join(dir, '.opencode');
  const agentDir = join(dir, '.agent');

  return existsSync(akConfig) ||
         existsSync(claudeDir) ||
         existsSync(opencodeDir) ||
         existsSync(agentDir);
}

/**
 * Get target directory path
 */
export function getTargetDir(projectDir, target = 'claude') {
  const folder = TARGETS[target] || TARGETS.claude;
  return join(projectDir, folder);
}

/**
 * Resolve source path (from --source flag or auto-detect)
 */
export function resolveSource(sourceFlag) {
  if (sourceFlag) {
    const resolved = resolve(sourceFlag);
    if (!existsSync(resolved)) {
      return { error: `Source path not found: ${sourceFlag}` };
    }

    // Check if it's a valid source
    const claudeDir = join(resolved, '.claude');
    const opencodeDir = join(resolved, '.opencode');

    if (existsSync(claudeDir)) {
      return {
        path: resolved,
        claudeDir,
        agentsMd: existsSync(join(resolved, 'AGENTS.md')) ? join(resolved, 'AGENTS.md') : null
      };
    }

    if (existsSync(opencodeDir)) {
      return {
        path: resolved,
        claudeDir: opencodeDir,
        agentsMd: existsSync(join(resolved, 'AGENTS.md')) ? join(resolved, 'AGENTS.md') : null
      };
    }

    return { error: `No .claude/ or .opencode/ found in: ${sourceFlag}` };
  }

  // Auto-detect
  const found = findSource();
  if (!found) {
    return {
      error: 'Could not find source. Use --source flag or ensure AGENTS.md/.claude/ exists in parent directories.'
    };
  }

  return found;
}
