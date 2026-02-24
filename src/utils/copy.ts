import fs from 'fs-extra';
import { join, basename, dirname } from 'path';
import type { CliTarget } from './paths.js';
import { CLI_ROOT } from './paths.js';

/**
 * Parse frontmatter from markdown file
 */
function parseFrontmatter(content: string): { description: string; argumentHint: string; body: string } {
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);

  if (!frontmatterMatch) {
    return { description: '', argumentHint: '', body: content };
  }

  const frontmatter = frontmatterMatch[1];
  const body = frontmatterMatch[2].trim();

  const descMatch = frontmatter.match(/description:\s*(.+)/);
  const argMatch = frontmatter.match(/argument-hint:\s*(.+)/);

  return {
    description: descMatch ? descMatch[1].trim() : '',
    argumentHint: argMatch ? argMatch[1].trim() : '',
    body
  };
}

/**
 * Escape TOML basic string (single line)
 */
function escapeTomlBasicString(str: string): string {
  return str
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\t/g, '\\t');
}

/**
 * Convert Claude MD command to Gemini TOML format
 * Uses literal strings (''') for prompts to avoid escape issues
 */
export function convertMdToToml(mdContent: string): string {
  const { description, body } = parseFrontmatter(mdContent);

  // Convert $ARGUMENTS to {{args}}
  const prompt = body.replace(/\$ARGUMENTS/g, '{{args}}');

  const lines: string[] = [];

  if (description) {
    // Use basic string for short description (escape special chars)
    lines.push(`description = "${escapeTomlBasicString(description)}"`);
  }

  // Use multi-line LITERAL strings (''') for prompt - no escape processing
  // This avoids issues with backslashes in shell commands
  lines.push(`prompt = '''\n${prompt}\n'''`);

  return lines.join('\n');
}

export interface CopyResult {
  copied: string[];
  skipped: string[];
  errors: Array<{ item: string; error: string }>;
}

export interface CopyStatusResult {
  success: boolean;
  error?: string;
}

export interface AvailableItem {
  name: string;
  isDir: boolean;
  path: string;
}

/**
 * Copy specific items from source to destination
 * @param {boolean} mergeMode - If true, skip existing files
 */
export async function copyItems(
  items: string[],
  type: string,
  sourceDir: string,
  destDir: string,
  mergeMode: boolean = false
): Promise<CopyResult> {
  const typeDir = join(sourceDir, type);
  const destTypeDir = join(destDir, type);

  if (!fs.existsSync(typeDir)) {
    return { copied: [], skipped: items, errors: [] };
  }

  await fs.ensureDir(destTypeDir);

  const copied: string[] = [];
  const skipped: string[] = [];
  const errors: Array<{ item: string; error: string }> = [];

  for (const item of items) {
    try {
      // Handle nested paths like "plan/parallel"
      const itemPath = join(typeDir, item);
      const itemPathMd = itemPath + '.md';

      let srcPath: string;
      if (fs.existsSync(itemPath)) {
        srcPath = itemPath;
      } else if (fs.existsSync(itemPathMd)) {
        srcPath = itemPathMd;
      } else {
        skipped.push(item);
        continue;
      }

      // Determine destination path
      const stat = fs.statSync(srcPath);
      if (stat.isDirectory()) {
        await fs.copy(srcPath, join(destTypeDir, item), { overwrite: !mergeMode });
      } else {
        // Preserve directory structure for nested items
        const destPath = srcPath.endsWith('.md')
          ? join(destTypeDir, item + '.md')
          : join(destTypeDir, item);
        await fs.ensureDir(join(destTypeDir, item.split('/').slice(0, -1).join('/')));
        await fs.copy(srcPath, destPath, { overwrite: !mergeMode });
      }

      copied.push(item);
    } catch (err: any) {
      errors.push({ item, error: err.message });
    }
  }

  return { copied, skipped, errors };
}

/**
 * Copy all items of a type
 * @param {boolean} mergeMode - If true, skip existing files
 */
export async function copyAllOfType(
  type: string,
  sourceDir: string,
  destDir: string,
  mergeMode: boolean = false
): Promise<CopyStatusResult> {
  const typeDir = join(sourceDir, type);
  const destTypeDir = join(destDir, type);

  if (!fs.existsSync(typeDir)) {
    return { success: false, error: `${type} directory not found` };
  }

  try {
    await fs.copy(typeDir, destTypeDir, { overwrite: !mergeMode });
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Copy router directory
 * @param {boolean} mergeMode - If true, skip existing files
 */
export async function copyRouter(
  sourceDir: string,
  destDir: string,
  mergeMode: boolean = false
): Promise<CopyStatusResult> {
  const routerDir = join(sourceDir, 'router');

  if (!fs.existsSync(routerDir)) {
    return { success: false, error: 'Router directory not found' };
  }

  try {
    await fs.copy(routerDir, join(destDir, 'router'), { overwrite: !mergeMode });
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Copy hooks directory
 * @param {boolean} mergeMode - If true, skip existing files
 */
export async function copyHooks(
  sourceDir: string,
  destDir: string,
  mergeMode: boolean = false
): Promise<CopyStatusResult> {
  const hooksDir = join(sourceDir, 'hooks');

  if (!fs.existsSync(hooksDir)) {
    return { success: false, error: 'Hooks directory not found' };
  }

  try {
    await fs.copy(hooksDir, join(destDir, 'hooks'), { overwrite: !mergeMode });
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Copy workflows directory
 */
export async function copyWorkflows(
  items: string[] | 'all',
  sourceDir: string,
  destDir: string
): Promise<CopyResult | CopyStatusResult> {
  if (items === 'all') {
    return copyAllOfType('workflows', sourceDir, destDir);
  }
  return copyItems(items, 'workflows', sourceDir, destDir);
}

/**
 * Copy base files (README, settings, statusline, etc.)
 * @param {boolean} mergeMode - If true, skip existing files
 */
export async function copyBaseFiles(
  sourceDir: string,
  destDir: string,
  mergeMode: boolean = false
): Promise<string[]> {
  const baseFiles = ['README.md', 'settings.json', '.env.example', 'statusline.cjs', 'statusline.ps1', 'statusline.sh'];
  const copied: string[] = [];

  for (const file of baseFiles) {
    const srcPath = join(sourceDir, file);
    const destPath = join(destDir, file);

    // Skip if merge mode and file exists
    if (mergeMode && fs.existsSync(destPath)) {
      continue;
    }

    if (fs.existsSync(srcPath)) {
      await fs.copy(srcPath, destPath, { overwrite: !mergeMode });
      copied.push(file);
    }
  }

  return copied;
}

/**
 * Copy a directory (memory, output-styles, scripts, etc.)
 * @param {boolean} mergeMode - If true, skip existing files
 */
export async function copyDirectory(
  dirName: string,
  sourceDir: string,
  destDir: string,
  mergeMode: boolean = false
): Promise<CopyStatusResult> {
  const srcPath = join(sourceDir, dirName);

  if (!fs.existsSync(srcPath)) {
    return { success: false, error: `${dirName} directory not found` };
  }

  try {
    await fs.copy(srcPath, join(destDir, dirName), { overwrite: !mergeMode });
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Copy AGENTS.md to project root
 * @param {boolean} mergeMode - If true, skip if file exists
 */
export async function copyAgentsMd(
  agentsMdPath: string | null,
  projectDir: string,
  mergeMode: boolean = false
): Promise<boolean> {
  if (!agentsMdPath || !fs.existsSync(agentsMdPath)) {
    return false;
  }

  const destPath = join(projectDir, 'AGENTS.md');

  // Skip if merge mode and file exists
  if (mergeMode && fs.existsSync(destPath)) {
    return false;
  }

  await fs.copy(agentsMdPath, destPath, { overwrite: !mergeMode });
  return true;
}

/**
 * List available items of a type
 */
export function listAvailable(type: string, sourceDir: string): AvailableItem[] {
  const typeDir = join(sourceDir, type);

  if (!fs.existsSync(typeDir)) {
    return [];
  }

  const items = fs.readdirSync(typeDir);
  return items.map(item => {
    const itemPath = join(typeDir, item);
    const isDir = fs.statSync(itemPath).isDirectory();
    const name = item.replace(/\.md$/, '');
    return { name, isDir, path: itemPath };
  });
}

/**
 * Copy commands to Gemini target (converts MD to TOML)
 */
export async function copyCommandsForGemini(
  items: string[] | 'all',
  sourceDir: string,
  destDir: string,
  mergeMode: boolean = false
): Promise<CopyResult> {
  const typeDir = join(sourceDir, 'commands');
  const destTypeDir = join(destDir, 'commands');

  if (!fs.existsSync(typeDir)) {
    return { copied: [], skipped: [], errors: [] };
  }

  await fs.ensureDir(destTypeDir);

  const copied: string[] = [];
  const skipped: string[] = [];
  const errors: Array<{ item: string; error: string }> = [];

  // Get all items if 'all'
  let itemList: string[];
  if (items === 'all') {
    // Get top-level items (files and directories)
    const entries = fs.readdirSync(typeDir);
    itemList = entries.map(e => e.replace(/\.md$/, ''));
    // Remove duplicates (plan.md and plan/ both become 'plan')
    itemList = [...new Set(itemList)];
  } else {
    itemList = items;
  }

  for (const item of itemList) {
    try {
      const srcPathMd = join(typeDir, item + '.md');
      const srcPathDir = join(typeDir, item);

      // Handle both file and directory with same name (e.g., plan.md AND plan/)
      let copiedSomething = false;

      // 1. Check if .md file exists - convert it
      if (fs.existsSync(srcPathMd) && fs.statSync(srcPathMd).isFile()) {
        const destPath = join(destTypeDir, item + '.toml');

        if (!(mergeMode && fs.existsSync(destPath))) {
          await fs.ensureDir(dirname(destPath));
          const mdContent = fs.readFileSync(srcPathMd, 'utf-8');
          const tomlContent = convertMdToToml(mdContent);
          await fs.writeFile(destPath, tomlContent, 'utf-8');
          copiedSomething = true;
        }
      }

      // 2. Check if directory exists - convert recursively
      if (fs.existsSync(srcPathDir) && fs.statSync(srcPathDir).isDirectory()) {
        await convertDirectoryToToml(srcPathDir, join(destTypeDir, item), mergeMode);
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

/**
 * Recursively convert a directory of MD files to TOML
 */
async function convertDirectoryToToml(
  srcDir: string,
  destDir: string,
  mergeMode: boolean = false
): Promise<void> {
  await fs.ensureDir(destDir);

  const entries = fs.readdirSync(srcDir);

  for (const entry of entries) {
    const srcPath = join(srcDir, entry);
    const stat = fs.statSync(srcPath);

    if (stat.isDirectory()) {
      await convertDirectoryToToml(srcPath, join(destDir, entry), mergeMode);
    } else if (entry.endsWith('.md')) {
      const destPath = join(destDir, entry.replace(/\.md$/, '.toml'));

      if (mergeMode && fs.existsSync(destPath)) {
        continue;
      }

      const mdContent = fs.readFileSync(srcPath, 'utf-8');
      const tomlContent = convertMdToToml(mdContent);
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

/**
 * List all files recursively (relative paths)
 */
function listAvailableRecursive(dir: string, base: string = ''): string[] {
  const results: string[] = [];
  const entries = fs.readdirSync(dir);

  for (const entry of entries) {
    const fullPath = join(dir, entry);
    const relativePath = base ? `${base}/${entry}` : entry;
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      results.push(...listAvailableRecursive(fullPath, relativePath));
    } else {
      results.push(relativePath);
    }
  }

  return results;
}

/**
 * Convert Claude agent MD to Gemini-compatible format
 * Maps Claude model names to Gemini equivalents
 * Converts tools from string to array format
 */
function convertAgentForGemini(mdContent: string): string {
  // Parse frontmatter
  const frontmatterMatch = mdContent.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!frontmatterMatch) return mdContent;

  let frontmatter = frontmatterMatch[1];
  const body = frontmatterMatch[2];

  // Map Claude models to Gemini models
  const modelMap: Record<string, string> = {
    'opus': 'gemini-2.5-pro',
    'sonnet': 'gemini-2.5-flash',
    'haiku': 'gemini-2.0-flash-lite',
    'inherit': '' // Remove inherit, let Gemini use default
  };

  // Replace model field
  for (const [claudeModel, geminiModel] of Object.entries(modelMap)) {
    const regex = new RegExp(`^model:\\s*${claudeModel}\\s*$`, 'm');
    if (geminiModel) {
      frontmatter = frontmatter.replace(regex, `model: ${geminiModel}`);
    } else {
      // Remove the model line if it's 'inherit'
      frontmatter = frontmatter.replace(regex, '');
    }
  }

  // Remove tools field - Claude and Gemini have different tool naming
  // Claude: "Glob, Grep, Read, Bash"
  // Gemini: "read_file, grep_search, run_shell_command, write_file"
  // Let Gemini use default tools instead of trying to map
  frontmatter = frontmatter.replace(/^tools:\s*.+$/m, '');

  // Add kind: local if not present
  if (!frontmatter.includes('kind:')) {
    frontmatter = frontmatter.trim() + '\nkind: local';
  }

  return `---\n${frontmatter.trim()}\n---\n${body}`;
}

/**
 * Copy agents to Gemini target (converts Claude agent format)
 * Gemini agents: .gemini/agents/*.md
 */
export async function copyAgentsForGemini(
  items: string[] | 'all',
  sourceDir: string,
  destDir: string,
  mergeMode: boolean = false
): Promise<CopyResult> {
  const typeDir = join(sourceDir, 'agents');
  const destTypeDir = join(destDir, 'agents');

  if (!fs.existsSync(typeDir)) {
    return { copied: [], skipped: [], errors: [] };
  }

  await fs.ensureDir(destTypeDir);

  const copied: string[] = [];
  const skipped: string[] = [];
  const errors: Array<{ item: string; error: string }> = [];

  // Get agent files
  let agentList: string[];
  if (items === 'all') {
    const entries = fs.readdirSync(typeDir);
    agentList = entries
      .filter(e => e.endsWith('.md') && e !== 'README.md')
      .map(e => e.replace(/\.md$/, ''));
  } else {
    agentList = items;
  }

  for (const agent of agentList) {
    try {
      const srcPath = join(typeDir, agent + '.md');

      if (!fs.existsSync(srcPath)) {
        skipped.push(agent);
        continue;
      }

      const destPath = join(destTypeDir, agent + '.md');

      // Skip if merge mode and destination exists
      if (mergeMode && fs.existsSync(destPath)) {
        skipped.push(agent);
        continue;
      }

      // Convert and write
      const mdContent = fs.readFileSync(srcPath, 'utf-8');
      const convertedContent = convertAgentForGemini(mdContent);
      await fs.writeFile(destPath, convertedContent, 'utf-8');
      copied.push(agent);
    } catch (err: any) {
      errors.push({ item: agent, error: err.message });
    }
  }

  return { copied, skipped, errors };
}

/**
 * Copy skills to Gemini target (skills use same SKILL.md format)
 * Gemini skills: .gemini/skills/<skill-name>/SKILL.md
 */
export async function copySkillsForGemini(
  items: string[] | 'all',
  sourceDir: string,
  destDir: string,
  mergeMode: boolean = false
): Promise<CopyResult> {
  const typeDir = join(sourceDir, 'skills');
  const destTypeDir = join(destDir, 'skills');

  if (!fs.existsSync(typeDir)) {
    return { copied: [], skipped: [], errors: [] };
  }

  await fs.ensureDir(destTypeDir);

  const copied: string[] = [];
  const skipped: string[] = [];
  const errors: Array<{ item: string; error: string }> = [];

  // Get skill directories
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

  for (const skill of skillList) {
    try {
      const srcPath = join(typeDir, skill);

      // Check if it's a valid skill directory with SKILL.md
      if (!fs.existsSync(srcPath) || !fs.statSync(srcPath).isDirectory()) {
        skipped.push(skill);
        continue;
      }

      const skillMdPath = join(srcPath, 'SKILL.md');
      if (!fs.existsSync(skillMdPath)) {
        skipped.push(skill);
        continue;
      }

      const destPath = join(destTypeDir, skill);

      // Skip if merge mode and destination exists
      if (mergeMode && fs.existsSync(destPath)) {
        skipped.push(skill);
        continue;
      }

      // Copy entire skill directory (SKILL.md + references, assets, etc.)
      await fs.copy(srcPath, destPath, { overwrite: !mergeMode });
      copied.push(skill);
    } catch (err: any) {
      errors.push({ skill, error: err.message });
    }
  }

  return { copied, skipped, errors };
}

/**
 * Copy Gemini-specific base files (settings.json with plan mode enabled)
 */
export async function copyGeminiBaseFiles(
  destDir: string,
  mergeMode: boolean = false
): Promise<string[]> {
  const geminiTemplates = join(CLI_ROOT, 'templates', 'gemini');
  const copied: string[] = [];

  // Copy settings.json if exists
  const settingsPath = join(geminiTemplates, 'settings.json');
  const destSettingsPath = join(destDir, 'settings.json');

  if (fs.existsSync(settingsPath)) {
    // Skip if merge mode and file exists
    if (mergeMode && fs.existsSync(destSettingsPath)) {
      return copied;
    }

    await fs.copy(settingsPath, destSettingsPath, { overwrite: !mergeMode });
    copied.push('settings.json');
  }

  return copied;
}

/**
 * Copy only unchanged files (for update)
 */
export async function copyUnchangedOnly(
  sourceDir: string,
  destDir: string,
  unchangedFiles: string[]
): Promise<{ copied: string[]; skipped: string[] }> {
  const copied: string[] = [];
  const skipped: string[] = [];

  for (const file of unchangedFiles) {
    const srcPath = join(sourceDir, file);
    const destPath = join(destDir, file);

    if (fs.existsSync(srcPath)) {
      await fs.ensureDir(join(destDir, file.split('/').slice(0, -1).join('/')));
      await fs.copy(srcPath, destPath, { overwrite: true });
      copied.push(file);
    } else {
      skipped.push(file);
    }
  }

  return { copied, skipped };
}

// ============================================================================
// Discord/Clawbot Support
// ============================================================================

/**
 * Convert Claude MD command to Discord/Clawbot JSON5 format
 * Commands become agent "commands" config in Clawbot
 */
function convertCommandForDiscord(mdContent: string, commandName: string): {
  name: string;
  description: string;
  prompt: string;
} {
  const { description, body } = parseFrontmatter(mdContent);

  // Convert $ARGUMENTS to {{args}} for consistency
  const prompt = body.replace(/\$ARGUMENTS/g, '{{args}}');

  return {
    name: commandName,
    description: description || `Execute ${commandName} command`,
    prompt
  };
}

/**
 * Convert Claude agent MD to Discord/Clawbot-compatible format
 * Clawbot agents use similar YAML frontmatter but different model names
 */
function convertAgentForDiscord(mdContent: string): string {
  // Parse frontmatter
  const frontmatterMatch = mdContent.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!frontmatterMatch) return mdContent;

  let frontmatter = frontmatterMatch[1];
  const body = frontmatterMatch[2];

  // Map Claude models to Clawbot models (uses Claude API via OpenClaw)
  // Clawbot supports: claude-3-opus, claude-3-sonnet, claude-3-haiku
  const modelMap: Record<string, string> = {
    'opus': 'claude-3-opus',
    'sonnet': 'claude-3-sonnet',
    'haiku': 'claude-3-haiku',
    'inherit': '' // Remove inherit
  };

  // Replace model field
  for (const [claudeModel, discordModel] of Object.entries(modelMap)) {
    const regex = new RegExp(`^model:\\s*${claudeModel}\\s*$`, 'm');
    if (discordModel) {
      frontmatter = frontmatter.replace(regex, `model: ${discordModel}`);
    } else {
      frontmatter = frontmatter.replace(regex, '');
    }
  }

  // Remove tools field - Clawbot has different tool naming
  frontmatter = frontmatter.replace(/^tools:\s*.+$/m, '');

  // Add kind: local if not present
  if (!frontmatter.includes('kind:')) {
    frontmatter = frontmatter.trim() + '\nkind: local';
  }

  return `---\n${frontmatter.trim()}\n---\n${body}`;
}

/**
 * Copy agents to Discord target (converts Claude agent format)
 */
export async function copyAgentsForDiscord(
  items: string[] | 'all',
  sourceDir: string,
  destDir: string,
  mergeMode: boolean = false
): Promise<CopyResult> {
  const typeDir = join(sourceDir, 'agents');
  const destTypeDir = join(destDir, 'agents');

  if (!fs.existsSync(typeDir)) {
    return { copied: [], skipped: [], errors: [] };
  }

  await fs.ensureDir(destTypeDir);

  const copied: string[] = [];
  const skipped: string[] = [];
  const errors: Array<{ item: string; error: string }> = [];

  // Get agent files
  let agentList: string[];
  if (items === 'all') {
    const entries = fs.readdirSync(typeDir);
    agentList = entries
      .filter(e => e.endsWith('.md') && e !== 'README.md')
      .map(e => e.replace(/\.md$/, ''));
  } else {
    agentList = items;
  }

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

      const mdContent = fs.readFileSync(srcPath, 'utf-8');
      const convertedContent = convertAgentForDiscord(mdContent);
      await fs.writeFile(destPath, convertedContent, 'utf-8');
      copied.push(agent);
    } catch (err: any) {
      errors.push({ item: agent, error: err.message });
    }
  }

  return { copied, skipped, errors };
}

/**
 * Copy commands to Discord target
 * Commands are stored as .md files but also generate a commands.json5 for Clawbot
 */
export async function copyCommandsForDiscord(
  items: string[] | 'all',
  sourceDir: string,
  destDir: string,
  mergeMode: boolean = false
): Promise<CopyResult> {
  const typeDir = join(sourceDir, 'commands');
  const destTypeDir = join(destDir, 'commands');

  if (!fs.existsSync(typeDir)) {
    return { copied: [], skipped: [], errors: [] };
  }

  await fs.ensureDir(destTypeDir);

  const copied: string[] = [];
  const skipped: string[] = [];
  const errors: Array<{ item: string; error: string }> = [];

  // Collect commands for JSON5 config
  const commandsConfig: Record<string, { description: string; prompt: string }> = {};

  // Get all items if 'all'
  let itemList: string[];
  if (items === 'all') {
    const entries = fs.readdirSync(typeDir);
    itemList = entries.map(e => e.replace(/\.md$/, ''));
    itemList = [...new Set(itemList)];
  } else {
    itemList = items;
  }

  for (const item of itemList) {
    try {
      const srcPathMd = join(typeDir, item + '.md');
      const srcPathDir = join(typeDir, item);

      let copiedSomething = false;

      // Handle .md file
      if (fs.existsSync(srcPathMd) && fs.statSync(srcPathMd).isFile()) {
        const destPath = join(destTypeDir, item + '.md');

        if (!(mergeMode && fs.existsSync(destPath))) {
          await fs.ensureDir(dirname(destPath));
          const mdContent = fs.readFileSync(srcPathMd, 'utf-8');

          // Copy MD as-is (Clawbot can read MD prompts)
          await fs.copy(srcPathMd, destPath, { overwrite: !mergeMode });

          // Also add to commands config
          const cmd = convertCommandForDiscord(mdContent, item);
          commandsConfig[item] = {
            description: cmd.description,
            prompt: cmd.prompt
          };

          copiedSomething = true;
        }
      }

      // Handle directory (nested commands)
      if (fs.existsSync(srcPathDir) && fs.statSync(srcPathDir).isDirectory()) {
        await copyDirectoryForDiscord(srcPathDir, join(destTypeDir, item), mergeMode, commandsConfig, item);
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

  // Write commands.json5 config file for Clawbot
  const configPath = join(destDir, 'commands.json5');
  if (Object.keys(commandsConfig).length > 0 && !(mergeMode && fs.existsSync(configPath))) {
    const json5Content = generateCommandsJson5(commandsConfig);
    await fs.writeFile(configPath, json5Content, 'utf-8');
  }

  return { copied, skipped, errors };
}

/**
 * Recursively copy directory for Discord
 */
async function copyDirectoryForDiscord(
  srcDir: string,
  destDir: string,
  mergeMode: boolean,
  commandsConfig: Record<string, { description: string; prompt: string }>,
  parentName: string
): Promise<void> {
  await fs.ensureDir(destDir);

  const entries = fs.readdirSync(srcDir);

  for (const entry of entries) {
    const srcPath = join(srcDir, entry);
    const stat = fs.statSync(srcPath);

    if (stat.isDirectory()) {
      await copyDirectoryForDiscord(
        srcPath,
        join(destDir, entry),
        mergeMode,
        commandsConfig,
        `${parentName}/${entry}`
      );
    } else if (entry.endsWith('.md')) {
      const destPath = join(destDir, entry);

      if (mergeMode && fs.existsSync(destPath)) {
        continue;
      }

      const mdContent = fs.readFileSync(srcPath, 'utf-8');
      await fs.copy(srcPath, destPath, { overwrite: !mergeMode });

      // Add nested command to config
      const cmdName = `${parentName}/${entry.replace(/\.md$/, '')}`;
      const cmd = convertCommandForDiscord(mdContent, cmdName);
      commandsConfig[cmdName] = {
        description: cmd.description,
        prompt: cmd.prompt
      };
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

/**
 * Generate JSON5 config for Clawbot commands
 */
function generateCommandsJson5(
  commands: Record<string, { description: string; prompt: string }>
): string {
  const lines: string[] = [
    '// Clawbot Commands Configuration',
    '// Generated by Apero Kit CLI',
    '// These commands can be used as slash commands in Discord',
    '{',
    '  "commands": {'
  ];

  const cmdEntries = Object.entries(commands);
  cmdEntries.forEach(([name, cmd], index) => {
    const safeName = name.replace(/\//g, ':'); // plan/fast -> plan:fast
    const isLast = index === cmdEntries.length - 1;

    lines.push(`    "${safeName}": {`);
    lines.push(`      "description": ${JSON.stringify(cmd.description)},`);
    // Use multi-line string for prompt
    lines.push(`      "prompt": ${JSON.stringify(cmd.prompt)}`);
    lines.push(`    }${isLast ? '' : ','}`);
  });

  lines.push('  }');
  lines.push('}');

  return lines.join('\n');
}

/**
 * Copy skills to Discord target (same SKILL.md format)
 */
export async function copySkillsForDiscord(
  items: string[] | 'all',
  sourceDir: string,
  destDir: string,
  mergeMode: boolean = false
): Promise<CopyResult> {
  // Skills use same format, delegate to Gemini function
  return copySkillsForGemini(items, sourceDir, destDir, mergeMode);
}

/**
 * Copy Discord-specific base files (config.json5, etc.)
 */
export async function copyDiscordBaseFiles(
  destDir: string,
  mergeMode: boolean = false
): Promise<string[]> {
  const discordTemplates = join(CLI_ROOT, 'templates', 'discord');
  const copied: string[] = [];

  // List of Discord-specific files to copy
  const filesToCopy = ['config.json5', 'README.md'];

  for (const file of filesToCopy) {
    const srcPath = join(discordTemplates, file);
    const destPath = join(destDir, file);

    if (fs.existsSync(srcPath)) {
      if (mergeMode && fs.existsSync(destPath)) {
        continue;
      }
      await fs.copy(srcPath, destPath, { overwrite: !mergeMode });
      copied.push(file);
    }
  }

  return copied;
}

// ============================================================================
// OpenClaw Skills Conversion (Commands → Skills)
// ============================================================================

/**
 * Extract keywords from command content for trigger conditions
 */
function extractKeywords(content: string, commandName: string): string[] {
  const keywords = new Set<string>();

  // Add command name variations
  keywords.add(commandName);
  keywords.add(commandName.replace(/-/g, ' '));

  // Extract from common patterns
  const keywordPatterns = [
    /keywords?:\s*([^\n]+)/gi,
    /when.*(?:says?|mentions?|asks?).*["']([^"']+)["']/gi,
    /trigger.*["']([^"']+)["']/gi
  ];

  for (const pattern of keywordPatterns) {
    const matches = content.matchAll(pattern);
    for (const match of matches) {
      match[1].split(/[,;]/).forEach(k => keywords.add(k.trim().toLowerCase()));
    }
  }

  // Common intent keywords based on command name
  const intentMap: Record<string, string[]> = {
    'plan': ['plan', 'design', 'architect', 'implement', 'create plan'],
    'brainstorm': ['brainstorm', 'ideas', 'options', 'alternatives', 'think'],
    'fix': ['fix', 'debug', 'error', 'broken', 'issue', 'bug'],
    'code': ['code', 'implement', 'build', 'develop', 'write code'],
    'review': ['review', 'check', 'audit', 'look at'],
    'test': ['test', 'testing', 'spec', 'unit test'],
    'cook': ['cook', 'implement', 'build feature', 'develop'],
    'scout': ['scout', 'search', 'find', 'explore codebase'],
    'debug': ['debug', 'trace', 'diagnose', 'investigate']
  };

  const baseName = commandName.split('/')[0].split(':')[0];
  if (intentMap[baseName]) {
    intentMap[baseName].forEach(k => keywords.add(k));
  }

  return Array.from(keywords).slice(0, 10);
}

/**
 * Convert Claude command MD to OpenClaw SKILL.md format
 */
function convertCommandToSkill(mdContent: string, commandName: string): string {
  const { description, argumentHint, body } = parseFrontmatter(mdContent);

  // Convert $ARGUMENTS to {{args}}
  const prompt = body.replace(/\$ARGUMENTS/g, '{{args}}');

  // Extract keywords for trigger conditions
  const keywords = extractKeywords(body, commandName);

  // Build SKILL.md content
  const skillContent = `---
name: ${commandName.replace(/\//g, '-')}
description: ${description || `Execute ${commandName} task`}
user-invocable: true
disable-model-invocation: false
metadata: {"openclaw": {"always": true}}
---

# ${commandName.charAt(0).toUpperCase() + commandName.slice(1).replace(/-/g, ' ')}

## Trigger Conditions

Activate when user mentions:
${keywords.map(k => `- "${k}"`).join('\n')}

## Input
${argumentHint ? `Expected input: ${argumentHint.replace('$ARGUMENTS', '{{args}}')}` : 'User provides task description in natural language.'}

## Workflow

${prompt}

## Output Format

Provide clear, actionable response based on the workflow above.
`;

  return skillContent;
}

/**
 * Convert commands to OpenClaw skills format for Discord
 */
export async function convertCommandsToSkills(
  items: string[] | 'all',
  sourceDir: string,
  destDir: string,
  mergeMode: boolean = false
): Promise<CopyResult> {
  const typeDir = join(sourceDir, 'commands');
  const destTypeDir = join(destDir, 'skills');

  if (!fs.existsSync(typeDir)) {
    return { copied: [], skipped: [], errors: [] };
  }

  await fs.ensureDir(destTypeDir);

  const copied: string[] = [];
  const skipped: string[] = [];
  const errors: Array<{ item: string; error: string }> = [];

  // Get all items if 'all'
  let itemList: string[];
  if (items === 'all') {
    const entries = fs.readdirSync(typeDir);
    itemList = entries
      .filter(e => e.endsWith('.md') && e !== 'README.md')
      .map(e => e.replace(/\.md$/, ''));
    // Also get directories (nested commands)
    const dirs = entries.filter(e => {
      const fullPath = join(typeDir, e);
      return fs.statSync(fullPath).isDirectory();
    });
    itemList = [...new Set([...itemList, ...dirs])];
  } else {
    itemList = items;
  }

  for (const item of itemList) {
    try {
      const srcPathMd = join(typeDir, item + '.md');
      const srcPathDir = join(typeDir, item);

      // Handle .md file → skill directory
      if (fs.existsSync(srcPathMd) && fs.statSync(srcPathMd).isFile()) {
        const skillDir = join(destTypeDir, item.replace(/\//g, '-'));
        const skillPath = join(skillDir, 'SKILL.md');

        if (mergeMode && fs.existsSync(skillPath)) {
          skipped.push(item);
          continue;
        }

        await fs.ensureDir(skillDir);
        const mdContent = fs.readFileSync(srcPathMd, 'utf-8');
        const skillContent = convertCommandToSkill(mdContent, item);
        await fs.writeFile(skillPath, skillContent, 'utf-8');
        copied.push(item);
      }

      // Handle directory (nested commands) → nested skills
      if (fs.existsSync(srcPathDir) && fs.statSync(srcPathDir).isDirectory()) {
        await convertNestedCommandsToSkills(srcPathDir, destTypeDir, item, mergeMode);
        copied.push(item + '/*');
      }
    } catch (err: any) {
      errors.push({ item, error: err.message });
    }
  }

  return { copied, skipped, errors };
}

/**
 * Recursively convert nested commands to skills
 */
async function convertNestedCommandsToSkills(
  srcDir: string,
  destDir: string,
  parentName: string,
  mergeMode: boolean
): Promise<void> {
  const entries = fs.readdirSync(srcDir);

  for (const entry of entries) {
    const srcPath = join(srcDir, entry);
    const stat = fs.statSync(srcPath);

    if (stat.isDirectory()) {
      await convertNestedCommandsToSkills(
        srcPath,
        destDir,
        `${parentName}-${entry}`,
        mergeMode
      );
    } else if (entry.endsWith('.md') && entry !== 'README.md') {
      const skillName = `${parentName}-${entry.replace(/\.md$/, '')}`;
      const skillDir = join(destDir, skillName);
      const skillPath = join(skillDir, 'SKILL.md');

      if (mergeMode && fs.existsSync(skillPath)) {
        continue;
      }

      await fs.ensureDir(skillDir);
      const mdContent = fs.readFileSync(srcPath, 'utf-8');
      const skillContent = convertCommandToSkill(mdContent, skillName);
      await fs.writeFile(skillPath, skillContent, 'utf-8');
    }
  }
}

/**
 * Copy bundled skills (train-prompt, etc.) to Discord target
 */
export async function copyBundledSkillsForDiscord(
  destDir: string,
  mergeMode: boolean = false
): Promise<string[]> {
  const bundledSkillsDir = join(CLI_ROOT, 'templates', 'discord', 'skills');
  const destSkillsDir = join(destDir, 'skills');
  const copied: string[] = [];

  if (!fs.existsSync(bundledSkillsDir)) {
    return copied;
  }

  await fs.ensureDir(destSkillsDir);

  const skills = fs.readdirSync(bundledSkillsDir);
  for (const skill of skills) {
    const srcPath = join(bundledSkillsDir, skill);
    const destPath = join(destSkillsDir, skill);

    if (fs.statSync(srcPath).isDirectory()) {
      if (mergeMode && fs.existsSync(destPath)) {
        continue;
      }
      await fs.copy(srcPath, destPath, { overwrite: !mergeMode });
      copied.push(skill);
    }
  }

  return copied;
}
