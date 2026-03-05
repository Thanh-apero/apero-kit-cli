import fs from 'fs-extra';
import { join, dirname } from 'path';
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
 * Escape TOML basic string
 */
function escapeTomlString(str: string): string {
  return str
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\t/g, '\\t');
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
 * Convert Claude MD command to Gemini TOML format
 */
function convertCommandToToml(mdContent: string): string {
  const { frontmatter, body } = parseFrontmatter(mdContent);

  // Extract description from frontmatter
  const descMatch = frontmatter.match(/description:\s*(.+)/);
  const description = descMatch ? descMatch[1].trim() : '';

  // Convert $ARGUMENTS to {{args}}
  const prompt = body.trim().replace(/\$ARGUMENTS/g, '{{args}}');

  const lines: string[] = [];

  if (description) {
    lines.push(`description = "${escapeTomlString(description)}"`);
  }

  // Use multi-line literal strings (''') for prompt
  lines.push(`prompt = '''\n${prompt}\n'''`);

  return lines.join('\n');
}

/**
 * Gemini CLI adapter - converts Claude format to Gemini
 */
export class GeminiAdapter extends BaseTargetAdapter {
  readonly config: TargetConfig = {
    name: 'gemini',
    displayName: 'Gemini CLI',
    directory: '.gemini',
    features: {
      agents: true,
      skills: true,
      commands: true,
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

  async copyCommands(
    items: string[] | 'all',
    sourceDir: string,
    targetDir: string,
    mergeMode: boolean
  ): Promise<CopyResult> {
    const typeDir = join(sourceDir, 'commands');
    const destTypeDir = join(targetDir, 'commands');

    if (!fs.existsSync(typeDir)) {
      return { copied: [], skipped: [], errors: [] };
    }

    await fs.ensureDir(destTypeDir);

    // Get item list
    let itemList: string[];
    if (items === 'all') {
      const entries = fs.readdirSync(typeDir);
      itemList = [...new Set(entries.map(e => e.replace('.md', '')))];
    } else {
      itemList = items;
    }

    const copied: string[] = [];
    const skipped: string[] = [];
    const errors: Array<{ item: string; error: string }> = [];

    for (const item of itemList) {
      try {
        const srcPathMd = join(typeDir, item + '.md');
        const srcPathDir = join(typeDir, item);

        let copiedSomething = false;

        // Handle .md file - convert to TOML
        if (fs.existsSync(srcPathMd) && fs.statSync(srcPathMd).isFile()) {
          const destPath = join(destTypeDir, item + '.toml');

          if (!(mergeMode && fs.existsSync(destPath))) {
            await fs.ensureDir(dirname(destPath));
            const mdContent = fs.readFileSync(srcPathMd, 'utf-8');
            const tomlContent = convertCommandToToml(mdContent);
            await fs.writeFile(destPath, tomlContent, 'utf-8');
            copiedSomething = true;
          }
        }

        // Handle directory - convert recursively
        if (fs.existsSync(srcPathDir) && fs.statSync(srcPathDir).isDirectory()) {
          await this.convertDirectoryToToml(srcPathDir, join(destTypeDir, item), mergeMode);
          copiedSomething = true;
        }

        if (copiedSomething) {
          copied.push(item);
        } else {
          skipped.push(item);
        }
      } catch (err: any) {
        errors.push({ item, error: err.message });
      }
    }

    return { copied, skipped, errors };
  }

  private async convertDirectoryToToml(
    srcDir: string,
    destDir: string,
    mergeMode: boolean
  ): Promise<void> {
    await fs.ensureDir(destDir);

    const entries = fs.readdirSync(srcDir);

    for (const entry of entries) {
      const srcPath = join(srcDir, entry);
      const stat = fs.statSync(srcPath);

      if (stat.isDirectory()) {
        await this.convertDirectoryToToml(srcPath, join(destDir, entry), mergeMode);
      } else if (entry.endsWith('.md')) {
        const destPath = join(destDir, entry.replace('.md', '.toml'));

        if (mergeMode && fs.existsSync(destPath)) {
          continue;
        }

        const mdContent = fs.readFileSync(srcPath, 'utf-8');
        const tomlContent = convertCommandToToml(mdContent);
        await fs.writeFile(destPath, tomlContent, 'utf-8');
      } else {
        // Copy non-MD files as-is
        const destPath = join(destDir, entry);
        if (mergeMode && fs.existsSync(destPath)) {
          continue;
        }
        await fs.copy(srcPath, destPath, { overwrite: !mergeMode });
      }
    }
  }

  async copyBaseFiles(
    targetDir: string,
    mergeMode: boolean
  ): Promise<string[]> {
    const { CLI_ROOT } = await import('../utils/paths.js');
    const geminiTemplates = join(CLI_ROOT, 'templates', 'gemini');
    const copied: string[] = [];

    const settingsPath = join(geminiTemplates, 'settings.json');
    const destSettingsPath = join(targetDir, 'settings.json');

    if (fs.existsSync(settingsPath)) {
      if (!(mergeMode && fs.existsSync(destSettingsPath))) {
        await fs.copy(settingsPath, destSettingsPath, { overwrite: !mergeMode });
        copied.push('settings.json');
      }
    }

    return copied;
  }
}
