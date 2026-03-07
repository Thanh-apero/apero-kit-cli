import fs from 'fs-extra';
import { join } from 'path';
import { BaseTargetAdapter } from './base-adapter.js';
import type { TargetConfig, CopyResult } from './types.js';

/**
 * Model mapping from Claude to OpenAI Codex
 */
const MODEL_MAP: Record<string, string> = {
  'opus': 'o3',
  'sonnet': 'o4-mini',
  'haiku': 'gpt-4.1-mini',
  'inherit': '' // Remove inherit, let Codex use default
};

/**
 * Parse frontmatter from markdown file
 */
function parseFrontmatter(content: string): { frontmatter: string; body: string } {
  const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) {
    return { frontmatter: '', body: content };
  }
  return { frontmatter: match[1], body: match[2] };
}

/**
 * Convert Claude agent to Codex format
 */
function convertAgentToCodex(mdContent: string): string {
  const { frontmatter, body } = parseFrontmatter(mdContent);
  if (!frontmatter) return mdContent;

  let converted = frontmatter;

  // Map model names
  for (const [claudeModel, codexModel] of Object.entries(MODEL_MAP)) {
    const regex = new RegExp(`^model:\\s*${claudeModel}\\s*$`, 'm');
    if (codexModel) {
      converted = converted.replace(regex, `model: ${codexModel}`);
    } else {
      converted = converted.replace(regex, '');
    }
  }

  // Remove tools field (different naming between Claude and Codex)
  converted = converted.replace(/^tools:\s*.+$/m, '');

  return `---\n${converted.trim()}\n---\n${body}`;
}

/**
 * Codex CLI adapter - uses Agent Skills open standard
 * Skills use same SKILL.md format as Claude (name, description + markdown)
 *
 * Directory structure:
 * - .codex/      - Config files (config.toml, config.local.toml)
 * - .agents/     - Skills and agents directory
 *
 * @see https://developers.openai.com/codex/skills/
 * @see https://developers.openai.com/codex/config-basic/
 */
export class CodexAdapter extends BaseTargetAdapter {
  readonly config: TargetConfig = {
    name: 'codex',
    displayName: 'Codex CLI',
    directory: '.agents', // Main directory for skills/agents
    features: {
      agents: true,
      skills: true,
      commands: false, // Codex uses skills, not commands
      workflows: false,
      router: false,
      hooks: false,
      memory: false,
      scripts: false,
      'output-styles': false
    }
  };

  async copyAgents(
    items: string[] | 'all',
    sourceDir: string,
    targetDir: string,
    mergeMode: boolean
  ): Promise<CopyResult> {
    const typeDir = join(sourceDir, 'agents');
    const destTypeDir = join(targetDir, 'agents');

    if (!fs.existsSync(typeDir)) {
      return { copied: [], skipped: [], errors: [] };
    }

    await fs.ensureDir(destTypeDir);

    // Get agent list
    let agentList: string[];
    if (items === 'all') {
      const entries = fs.readdirSync(typeDir);
      agentList = entries
        .filter(e => e.endsWith('.md') && e !== 'README.md')
        .map(e => e.replace('.md', ''));
    } else {
      agentList = items;
    }

    const copied: string[] = [];
    const skipped: string[] = [];
    const errors: Array<{ item: string; error: string }> = [];

    for (const agent of agentList) {
      try {
        const srcPath = join(typeDir, agent + '.md');

        if (!fs.existsSync(srcPath)) {
          skipped.push(agent);
          continue;
        }

        const destPath = join(destTypeDir, agent + '.md');

        if (mergeMode && fs.existsSync(destPath)) {
          skipped.push(agent);
          continue;
        }

        // Convert and write
        const mdContent = fs.readFileSync(srcPath, 'utf-8');
        const convertedContent = convertAgentToCodex(mdContent);
        await fs.writeFile(destPath, convertedContent, 'utf-8');
        copied.push(agent);
      } catch (err: any) {
        errors.push({ item: agent, error: err.message });
      }
    }

    return { copied, skipped, errors };
  }

  async copySkills(
    items: string[] | 'all',
    sourceDir: string,
    targetDir: string,
    mergeMode: boolean
  ): Promise<CopyResult> {
    // Skills use same SKILL.md format - copy directly
    const typeDir = join(sourceDir, 'skills');
    const destTypeDir = join(targetDir, 'skills');

    if (!fs.existsSync(typeDir)) {
      return { copied: [], skipped: [], errors: [] };
    }

    await fs.ensureDir(destTypeDir);

    // Get skill list
    let skillList: string[];
    if (items === 'all') {
      const entries = fs.readdirSync(typeDir);
      skillList = entries.filter(e => {
        const fullPath = join(typeDir, e);
        return fs.statSync(fullPath).isDirectory() && fs.existsSync(join(fullPath, 'SKILL.md'));
      });
    } else {
      skillList = items;
    }

    const copied: string[] = [];
    const skipped: string[] = [];
    const errors: Array<{ item: string; error: string }> = [];

    for (const skill of skillList) {
      try {
        const srcPath = join(typeDir, skill);

        if (!fs.existsSync(srcPath) || !fs.statSync(srcPath).isDirectory()) {
          skipped.push(skill);
          continue;
        }

        if (!fs.existsSync(join(srcPath, 'SKILL.md'))) {
          skipped.push(skill);
          continue;
        }

        const destPath = join(destTypeDir, skill);

        if (mergeMode && fs.existsSync(destPath)) {
          skipped.push(skill);
          continue;
        }

        await fs.copy(srcPath, destPath, { overwrite: !mergeMode });
        copied.push(skill);
      } catch (err: any) {
        errors.push({ item: skill, error: err.message });
      }
    }

    return { copied, skipped, errors };
  }

  // Commands not supported - Codex uses skills instead
  async copyCommands(
    _items: string[] | 'all',
    _sourceDir: string,
    _targetDir: string,
    _mergeMode: boolean
  ): Promise<CopyResult> {
    return { copied: [], skipped: [], errors: [] };
  }

  async copyBaseFiles(
    targetDir: string,
    mergeMode: boolean
  ): Promise<string[]> {
    const { CLI_ROOT } = await import('../utils/paths.js');
    const codexTemplates = join(CLI_ROOT, 'templates', 'codex');
    const copied: string[] = [];

    // Get project root (parent of .agents directory)
    const projectRoot = join(targetDir, '..');

    // Config files go to .codex/ directory
    const codexConfigDir = join(projectRoot, '.codex');
    await fs.ensureDir(codexConfigDir);

    const configFiles = ['config.toml', 'config.local.toml'];
    for (const file of configFiles) {
      const srcPath = join(codexTemplates, file);
      const destPath = join(codexConfigDir, file);

      if (fs.existsSync(srcPath)) {
        if (!(mergeMode && fs.existsSync(destPath))) {
          await fs.copy(srcPath, destPath, { overwrite: !mergeMode });
          copied.push(`.codex/${file}`);
        }
      }
    }

    // AGENTS.md goes to project root
    const agentsMdSrc = join(codexTemplates, 'AGENTS.md');
    const agentsMdDest = join(projectRoot, 'AGENTS.md');

    if (fs.existsSync(agentsMdSrc)) {
      if (!(mergeMode && fs.existsSync(agentsMdDest))) {
        await fs.copy(agentsMdSrc, agentsMdDest, { overwrite: !mergeMode });
        copied.push('AGENTS.md');
      }
    }

    return copied;
  }
}
