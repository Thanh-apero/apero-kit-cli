import fs from 'fs-extra';
import { join } from 'path';
import { BaseTargetAdapter } from './base-adapter.js';
import type { TargetConfig, CopyResult } from './types.js';

/**
 * Model mapping from Claude to Gemini
 */
const MODEL_MAP: Record<string, string> = {
  'opus': 'gemini-2.5-pro',
  'sonnet': 'gemini-2.5-flash',
  'haiku': 'gemini-2.0-flash-lite',
  'inherit': '' // Remove inherit, let Gemini use default
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
 * Convert Claude agent to Gemini format
 */
function convertAgentToGemini(mdContent: string): string {
  const { frontmatter, body } = parseFrontmatter(mdContent);
  if (!frontmatter) return mdContent;

  let converted = frontmatter;

  // Map model names
  for (const [claudeModel, geminiModel] of Object.entries(MODEL_MAP)) {
    const regex = new RegExp(`^model:\\s*${claudeModel}\\s*$`, 'm');
    if (geminiModel) {
      converted = converted.replace(regex, `model: ${geminiModel}`);
    } else {
      converted = converted.replace(regex, '');
    }
  }

  // Remove tools field (different naming between Claude and Gemini)
  converted = converted.replace(/^tools:\s*.+$/m, '');

  // Add kind: local if not present
  if (!converted.includes('kind:')) {
    converted = converted.trim() + '\nkind: local';
  }

  return `---\n${converted.trim()}\n---\n${body}`;
}


/**
 * Gemini CLI adapter - uses Agent Skills open standard
 * Skills use same SKILL.md format as Claude (name, description + markdown)
 * Directory: .gemini/skills/
 */
export class GeminiAdapter extends BaseTargetAdapter {
  readonly config: TargetConfig = {
    name: 'gemini',
    displayName: 'Gemini CLI',
    directory: '.gemini',
    features: {
      agents: true,
      skills: true,
      commands: false, // Gemini uses skills, not commands
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
        const convertedContent = convertAgentToGemini(mdContent);
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

  // Commands not supported - Gemini uses skills instead
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
    const geminiTemplates = join(CLI_ROOT, 'templates', 'gemini');
    const copied: string[] = [];

    // Get project root (parent of .gemini directory)
    const projectRoot = join(targetDir, '..');

    // Settings files go to .gemini/ directory
    const settingsFiles = ['settings.json', 'settings.local.json'];
    for (const file of settingsFiles) {
      const srcPath = join(geminiTemplates, file);
      const destPath = join(targetDir, file);

      if (fs.existsSync(srcPath)) {
        if (!(mergeMode && fs.existsSync(destPath))) {
          await fs.copy(srcPath, destPath, { overwrite: !mergeMode });
          copied.push(file);
        }
      }
    }

    // GEMINI.md goes to project root
    const geminiMdSrc = join(geminiTemplates, 'GEMINI.md');
    const geminiMdDest = join(projectRoot, 'GEMINI.md');

    if (fs.existsSync(geminiMdSrc)) {
      if (!(mergeMode && fs.existsSync(geminiMdDest))) {
        await fs.copy(geminiMdSrc, geminiMdDest, { overwrite: !mergeMode });
        copied.push('GEMINI.md (project root)');
      }
    }

    return copied;
  }
}
