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

// CK-Internal paths (latest Claude Kit source)
const CK_INTERNAL_PATHS = [
  '/Users/nguyenthanh/AndroidStudioProjects/CK-Internal',
  join(homedir(), 'AndroidStudioProjects/CK-Internal'),
  join(homedir(), 'CK-Internal')
];

export const TARGETS: Record<string, string> = {
  claude: '.claude',
  gemini: '.gemini',
  codex: '.agents',  // Codex uses .agents for skills, .codex for config
  discord: '.discord',
  opencode: '.opencode',
  generic: '.agent'
};

export type CliTarget = 'claude' | 'gemini' | 'codex' | 'discord';

export interface SourceInfo {
  path: string;
  type: string;
  claudeDir: string;
  agentsDir: string | null;  // .agents/ directory for Codex
  agentsMd: string | null;
  claudeMd: string | null;
  geminiMd: string | null;
  error?: undefined;
}

export interface SourceError {
  error: string;
}

/**
 * Get CK-Internal source (latest Claude Kit)
 */
export function getCkInternalSource(): SourceInfo | null {
  for (const basePath of CK_INTERNAL_PATHS) {
    const claudeDir = join(basePath, '.claude');
    if (existsSync(claudeDir) && existsSync(join(claudeDir, 'skills'))) {
      const agentsDir = join(basePath, '.agents');
      const agentsMd = join(basePath, 'AGENTS.md');
      const claudeMd = join(basePath, 'CLAUDE.md');
      const geminiMd = join(basePath, 'GEMINI.md');
      return {
        path: basePath,
        type: 'ck-internal',
        claudeDir,
        agentsDir: existsSync(agentsDir) ? agentsDir : null,
        agentsMd: existsSync(agentsMd) ? agentsMd : null,
        claudeMd: existsSync(claudeMd) ? claudeMd : null,
        geminiMd: existsSync(geminiMd) ? geminiMd : null
      };
    }
  }
  return null;
}

/**
 * Get embedded templates (bundled with CLI)
 */
export function getEmbeddedTemplates(): SourceInfo | null {
  if (existsSync(TEMPLATES_DIR)) {
    const agentsDir = join(TEMPLATES_DIR, '..', '.agents');
    const agentsMd = join(TEMPLATES_DIR, 'AGENTS.md');
    const claudeMd = join(TEMPLATES_DIR, 'CLAUDE.md');
    const geminiMd = join(TEMPLATES_DIR, 'GEMINI.md');
    return {
      path: TEMPLATES_DIR,
      type: 'embedded',
      claudeDir: TEMPLATES_DIR,
      agentsDir: existsSync(agentsDir) ? agentsDir : null,
      agentsMd: existsSync(agentsMd) ? agentsMd : null,
      claudeMd: existsSync(claudeMd) ? claudeMd : null,
      geminiMd: existsSync(geminiMd) ? geminiMd : null
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
  const codexDir = join(dir, '.codex');
  const agentsDir = join(dir, '.agents'); // Codex skills directory
  const opencodeDir = join(dir, '.opencode');
  const agentDir = join(dir, '.agent');

  return existsSync(akConfig) ||
         existsSync(claudeDir) ||
         existsSync(geminiDir) ||
         existsSync(codexDir) ||
         existsSync(agentsDir) ||
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
 * Resolve source path
 * Priority: 1. --source flag  2. CK-Internal  3. Embedded templates
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

    const agentsDir = join(resolved, '.agents');

    if (existsSync(claudeDir)) {
      return {
        path: resolved,
        type: 'custom',
        claudeDir,
        agentsDir: existsSync(agentsDir) ? agentsDir : null,
        agentsMd: existsSync(join(resolved, 'AGENTS.md')) ? join(resolved, 'AGENTS.md') : null,
        claudeMd: existsSync(join(resolved, 'CLAUDE.md')) ? join(resolved, 'CLAUDE.md') : null,
        geminiMd: existsSync(join(resolved, 'GEMINI.md')) ? join(resolved, 'GEMINI.md') : null
      };
    }

    if (existsSync(opencodeDir)) {
      return {
        path: resolved,
        type: 'custom',
        claudeDir: opencodeDir,
        agentsDir: existsSync(agentsDir) ? agentsDir : null,
        agentsMd: existsSync(join(resolved, 'AGENTS.md')) ? join(resolved, 'AGENTS.md') : null,
        claudeMd: existsSync(join(resolved, 'CLAUDE.md')) ? join(resolved, 'CLAUDE.md') : null,
        geminiMd: existsSync(join(resolved, 'GEMINI.md')) ? join(resolved, 'GEMINI.md') : null
      };
    }

    // If source flag points directly to a templates dir (no .claude wrapper)
    if (existsSync(join(resolved, 'agents')) || existsSync(join(resolved, 'commands'))) {
      return {
        path: resolved,
        type: 'custom',
        claudeDir: resolved,
        agentsDir: existsSync(agentsDir) ? agentsDir : null,
        agentsMd: existsSync(join(resolved, 'AGENTS.md')) ? join(resolved, 'AGENTS.md') : null,
        claudeMd: existsSync(join(resolved, 'CLAUDE.md')) ? join(resolved, 'CLAUDE.md') : null,
        geminiMd: existsSync(join(resolved, 'GEMINI.md')) ? join(resolved, 'GEMINI.md') : null
      };
    }

    return { error: `No templates found in: ${sourceFlag}` };
  }

  // 2. Check CK-Internal (latest Claude Kit source)
  const ckInternal = getCkInternalSource();
  if (ckInternal) {
    return ckInternal;
  }

  // 3. Use embedded templates (bundled with CLI)
  const embedded = getEmbeddedTemplates();
  if (embedded) {
    return embedded;
  }

  return {
    error: 'No templates found. Reinstall: npm install -g thanh-kit'
  };
}
