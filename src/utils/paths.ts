import { fileURLToPath } from 'url';
import { dirname, join, resolve } from 'path';
import { existsSync, statSync } from 'fs';
import { homedir } from 'os';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// When bundled with tsup, all code is in dist/index.js, so __dirname is 'dist'
// When unbundled (dev), this file is in src/utils, so __dirname is 'src/utils'
// We need to go up one level from dist, or two levels from src/utils
export const CLI_ROOT = __dirname.endsWith('dist')
  ? resolve(__dirname, '..')
  : resolve(__dirname, '../..');
export const TEMPLATES_DIR = join(CLI_ROOT, 'templates');

export const TARGETS: Record<string, string> = {
  claude: '.claude',
  gemini: '.gemini',
  opencode: '.opencode',
  generic: '.agent'
};

export type CliTarget = 'claude' | 'gemini';

export interface SourceInfo {
  path: string;
  type: string;
  claudeDir: string;
  agentsMd: string | null;
  error?: undefined;
}

export interface SourceError {
  error: string;
}

/**
 * Get embedded templates (bundled with CLI)
 */
export function getEmbeddedTemplates(): SourceInfo | null {
  if (existsSync(TEMPLATES_DIR)) {
    const agentsMd = join(TEMPLATES_DIR, 'AGENTS.md');
    return {
      path: TEMPLATES_DIR,
      type: 'embedded',
      claudeDir: TEMPLATES_DIR,
      agentsMd: existsSync(agentsMd) ? agentsMd : null
    };
  }
  return null;
}

/**
 * Get global installation path
 */
export function getGlobalInstallPath(): string {
  if (process.platform === 'win32') {
    return join(process.env.APPDATA || join(homedir(), 'AppData', 'Roaming'), 'claude');
  }
  return join(homedir(), '.claude');
}

/**
 * Check if current directory is an ak project
 */
export function isAkProject(dir: string = process.cwd()): boolean {
  const akConfig = join(dir, '.ak', 'state.json');
  const claudeDir = join(dir, '.claude');
  const geminiDir = join(dir, '.gemini');
  const opencodeDir = join(dir, '.opencode');
  const agentDir = join(dir, '.agent');

  return existsSync(akConfig) ||
         existsSync(claudeDir) ||
         existsSync(geminiDir) ||
         existsSync(opencodeDir) ||
         existsSync(agentDir);
}

/**
 * Get target directory path
 */
export function getTargetDir(projectDir: string, target: string = 'claude'): string {
  const folder = TARGETS[target] || TARGETS.claude;
  return join(projectDir, folder);
}

/**
 * Resolve source path (from --source flag or embedded templates)
 * Priority: 1. --source flag  2. Embedded templates
 */
export function resolveSource(sourceFlag?: string): SourceInfo | SourceError {
  // 1. If --source flag provided, use it
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
        type: 'custom',
        claudeDir,
        agentsMd: existsSync(join(resolved, 'AGENTS.md')) ? join(resolved, 'AGENTS.md') : null
      };
    }

    if (existsSync(opencodeDir)) {
      return {
        path: resolved,
        type: 'custom',
        claudeDir: opencodeDir,
        agentsMd: existsSync(join(resolved, 'AGENTS.md')) ? join(resolved, 'AGENTS.md') : null
      };
    }

    // If source flag points directly to a templates dir (no .claude wrapper)
    if (existsSync(join(resolved, 'agents')) || existsSync(join(resolved, 'commands'))) {
      return {
        path: resolved,
        type: 'custom',
        claudeDir: resolved,
        agentsMd: existsSync(join(resolved, 'AGENTS.md')) ? join(resolved, 'AGENTS.md') : null
      };
    }

    return { error: `No templates found in: ${sourceFlag}` };
  }

  // 2. Use embedded templates (bundled with CLI)
  const embedded = getEmbeddedTemplates();
  if (embedded) {
    return embedded;
  }

  return {
    error: 'No templates found. Reinstall: npm install -g apero-kit-cli'
  };
}
