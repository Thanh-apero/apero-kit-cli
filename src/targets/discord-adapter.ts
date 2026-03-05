import fs from 'fs-extra';
import { join, dirname } from 'path';
import { BaseTargetAdapter } from './base-adapter.js';
import type { TargetConfig, CopyResult } from './types.js';

/**
 * Model mapping from Claude to Discord/OpenClaw
 */
const MODEL_MAP: Record<string, string> = {
  'opus': 'claude-3-opus',
  'sonnet': 'claude-3-sonnet',
  'haiku': 'claude-3-haiku',
  'inherit': ''
};

/**
 * Parse frontmatter from markdown file
 */
function parseFrontmatter(content: string): {
  frontmatter: string;
  body: string;
  description: string;
  argumentHint: string;
} {
  const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) {
    return { frontmatter: '', body: content, description: '', argumentHint: '' };
  }

  const frontmatter = match[1];
  const body = match[2].trim();
  const descMatch = frontmatter.match(/description:\s*(.+)/);
  const argMatch = frontmatter.match(/argument-hint:\s*(.+)/);

  return {
    frontmatter,
    body,
    description: descMatch ? descMatch[1].trim() : '',
    argumentHint: argMatch ? argMatch[1].trim() : ''
  };
}

/**
 * Convert Claude agent to Discord format
 */
function convertAgentToDiscord(mdContent: string): string {
  const { frontmatter, body } = parseFrontmatter(mdContent);
  if (!frontmatter) return mdContent;

  let converted = frontmatter;

  // Map model names
  for (const [claudeModel, discordModel] of Object.entries(MODEL_MAP)) {
    const regex = new RegExp(`^model:\\s*${claudeModel}\\s*$`, 'm');
    if (discordModel) {
      converted = converted.replace(regex, `model: ${discordModel}`);
    } else {
      converted = converted.replace(regex, '');
    }
  }

  // Remove tools field
  converted = converted.replace(/^tools:\s*.+$/m, '');

  // Add kind: local if not present
  if (!converted.includes('kind:')) {
    converted = converted.trim() + '\nkind: local';
  }

  return `---\n${converted.trim()}\n---\n${body}`;
}

/**
 * Extract keywords from command content for trigger conditions
 */
function extractKeywords(content: string, commandName: string): string[] {
  const keywords = new Set<string>();

  keywords.add(commandName);
  keywords.add(commandName.replace(/-/g, ' '));

  const intentMap: Record<string, string[]> = {
    'plan': ['plan', 'design', 'architect', 'implement', 'create plan'],
    'brainstorm': ['brainstorm', 'ideas', 'options', 'alternatives'],
    'fix': ['fix', 'debug', 'error', 'broken', 'issue', 'bug'],
    'code': ['code', 'implement', 'build', 'develop', 'write code'],
    'review': ['review', 'check', 'audit', 'look at'],
    'test': ['test', 'testing', 'spec', 'unit test'],
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
 * Convert command to OpenClaw SKILL.md format
 */
function convertCommandToSkill(mdContent: string, commandName: string): string {
  const { description, argumentHint, body } = parseFrontmatter(mdContent);
  const prompt = body.replace(/\$ARGUMENTS/g, '{{args}}');
  const keywords = extractKeywords(body, commandName);

  return `---
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
}

/**
 * Discord/OpenClaw adapter
 */
export class DiscordAdapter extends BaseTargetAdapter {
  readonly config: TargetConfig = {
    name: 'discord',
    displayName: 'Discord + OpenClaw',
    directory: '.discord',
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

        const mdContent = fs.readFileSync(srcPath, 'utf-8');
        const convertedContent = convertAgentToDiscord(mdContent);
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
    // Skills use same SKILL.md format
    const typeDir = join(sourceDir, 'skills');
    const destTypeDir = join(targetDir, 'skills');

    if (!fs.existsSync(typeDir)) {
      return { copied: [], skipped: [], errors: [] };
    }

    await fs.ensureDir(destTypeDir);

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

    // Also copy bundled Discord-specific skills
    const bundledCopied = await this.copyBundledSkills(targetDir, mergeMode);
    copied.push(...bundledCopied);

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
    const destSkillsDir = join(targetDir, 'skills');

    if (!fs.existsSync(typeDir)) {
      return { copied: [], skipped: [], errors: [] };
    }

    await fs.ensureDir(destTypeDir);
    await fs.ensureDir(destSkillsDir);

    let itemList: string[];
    if (items === 'all') {
      const entries = fs.readdirSync(typeDir);
      itemList = entries
        .filter(e => e.endsWith('.md') && e !== 'README.md')
        .map(e => e.replace('.md', ''));
      // Also get directories
      const dirs = entries.filter(e => {
        const fullPath = join(typeDir, e);
        return fs.statSync(fullPath).isDirectory();
      });
      itemList = [...new Set([...itemList, ...dirs])];
    } else {
      itemList = items;
    }

    const copied: string[] = [];
    const skipped: string[] = [];
    const errors: Array<{ item: string; error: string }> = [];
    const commandsConfig: Record<string, { description: string; prompt: string }> = {};

    for (const item of itemList) {
      try {
        const srcPathMd = join(typeDir, item + '.md');
        const srcPathDir = join(typeDir, item);

        // Handle .md file
        if (fs.existsSync(srcPathMd) && fs.statSync(srcPathMd).isFile()) {
          const destPath = join(destTypeDir, item + '.md');
          const skillDir = join(destSkillsDir, item.replace(/\//g, '-'));
          const skillPath = join(skillDir, 'SKILL.md');

          if (!(mergeMode && fs.existsSync(destPath))) {
            await fs.ensureDir(dirname(destPath));
            const mdContent = fs.readFileSync(srcPathMd, 'utf-8');

            // Copy MD as-is
            await fs.copy(srcPathMd, destPath, { overwrite: !mergeMode });

            // Also convert to skill
            if (!(mergeMode && fs.existsSync(skillPath))) {
              await fs.ensureDir(skillDir);
              const skillContent = convertCommandToSkill(mdContent, item);
              await fs.writeFile(skillPath, skillContent, 'utf-8');
            }

            // Add to commands config
            const { description, body } = parseFrontmatter(mdContent);
            commandsConfig[item] = {
              description: description || `Execute ${item} command`,
              prompt: body.replace(/\$ARGUMENTS/g, '{{args}}')
            };

            copied.push(item);
          } else {
            skipped.push(item);
          }
        }

        // Handle directory (nested commands)
        if (fs.existsSync(srcPathDir) && fs.statSync(srcPathDir).isDirectory()) {
          await this.copyNestedCommands(srcPathDir, destTypeDir, destSkillsDir, item, mergeMode, commandsConfig);
          copied.push(item + '/*');
        }
      } catch (err: any) {
        errors.push({ item, error: err.message });
      }
    }

    // Write commands.json5 config
    const configPath = join(targetDir, 'commands.json5');
    if (Object.keys(commandsConfig).length > 0 && !(mergeMode && fs.existsSync(configPath))) {
      const json5Content = this.generateCommandsJson5(commandsConfig);
      await fs.writeFile(configPath, json5Content, 'utf-8');
    }

    return { copied, skipped, errors };
  }

  private async copyNestedCommands(
    srcDir: string,
    destDir: string,
    destSkillsDir: string,
    parentName: string,
    mergeMode: boolean,
    commandsConfig: Record<string, { description: string; prompt: string }>
  ): Promise<void> {
    const destTypeDir = join(destDir, parentName);
    await fs.ensureDir(destTypeDir);

    const entries = fs.readdirSync(srcDir);

    for (const entry of entries) {
      const srcPath = join(srcDir, entry);
      const stat = fs.statSync(srcPath);

      if (stat.isDirectory()) {
        await this.copyNestedCommands(
          srcPath,
          destTypeDir,
          destSkillsDir,
          entry,
          mergeMode,
          commandsConfig
        );
      } else if (entry.endsWith('.md') && entry !== 'README.md') {
        const destPath = join(destTypeDir, entry);
        const cmdName = `${parentName}/${entry.replace('.md', '')}`;
        const skillName = cmdName.replace(/\//g, '-');
        const skillDir = join(destSkillsDir, skillName);
        const skillPath = join(skillDir, 'SKILL.md');

        if (mergeMode && fs.existsSync(destPath)) {
          continue;
        }

        const mdContent = fs.readFileSync(srcPath, 'utf-8');

        // Copy MD
        await fs.copy(srcPath, destPath, { overwrite: !mergeMode });

        // Convert to skill
        if (!(mergeMode && fs.existsSync(skillPath))) {
          await fs.ensureDir(skillDir);
          const skillContent = convertCommandToSkill(mdContent, skillName);
          await fs.writeFile(skillPath, skillContent, 'utf-8');
        }

        // Add to config
        const { description, body } = parseFrontmatter(mdContent);
        commandsConfig[cmdName] = {
          description: description || `Execute ${cmdName} command`,
          prompt: body.replace(/\$ARGUMENTS/g, '{{args}}')
        };
      }
    }
  }

  private generateCommandsJson5(
    commands: Record<string, { description: string; prompt: string }>
  ): string {
    const lines: string[] = [
      '// Clawbot Commands Configuration',
      '// Generated by Thanh Kit CLI',
      '{',
      '  "commands": {'
    ];

    const cmdEntries = Object.entries(commands);
    cmdEntries.forEach(([name, cmd], index) => {
      const safeName = name.replace(/\//g, ':');
      const isLast = index === cmdEntries.length - 1;

      lines.push(`    "${safeName}": {`);
      lines.push(`      "description": ${JSON.stringify(cmd.description)},`);
      lines.push(`      "prompt": ${JSON.stringify(cmd.prompt)}`);
      lines.push(`    }${isLast ? '' : ','}`);
    });

    lines.push('  }');
    lines.push('}');

    return lines.join('\n');
  }

  private async copyBundledSkills(
    targetDir: string,
    mergeMode: boolean
  ): Promise<string[]> {
    const { CLI_ROOT } = await import('../utils/paths.js');
    const bundledSkillsDir = join(CLI_ROOT, 'templates', 'discord', 'skills');
    const destSkillsDir = join(targetDir, 'skills');
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
        copied.push(`bundled:${skill}`);
      }
    }

    return copied;
  }

  async copyBaseFiles(
    targetDir: string,
    mergeMode: boolean
  ): Promise<string[]> {
    const { CLI_ROOT } = await import('../utils/paths.js');
    const discordTemplates = join(CLI_ROOT, 'templates', 'discord');
    const copied: string[] = [];

    const filesToCopy = ['config.json5', 'README.md'];

    for (const file of filesToCopy) {
      const srcPath = join(discordTemplates, file);
      const destPath = join(targetDir, file);

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

  /**
   * Update Discord config with bot token
   */
  async updateConfig(
    targetDir: string,
    token: string,
    guildId?: string
  ): Promise<void> {
    const configPath = join(targetDir, 'config.json5');

    if (!fs.existsSync(configPath)) {
      return;
    }

    let content = await fs.readFile(configPath, 'utf-8');

    content = content.replace(
      '"token": "${DISCORD_BOT_TOKEN}"',
      `"token": "${token}"`
    );

    if (guildId) {
      const guildConfig = `"${guildId}": {
          "requireMention": true,
          "users": [],
          "roles": [],
          "channels": {}
        }`;

      content = content.replace(
        '"guilds": {\n        // Example guild configuration',
        `"guilds": {\n        ${guildConfig},\n        // Example guild configuration`
      );
    }

    await fs.writeFile(configPath, content, 'utf-8');
  }

  /**
   * Setup OpenClaw CLI configuration
   */
  async setupOpenClaw(token: string): Promise<{ success: boolean; message: string }> {
    const { execSync } = await import('child_process');

    try {
      execSync('which openclaw', { stdio: 'ignore' });
    } catch {
      return { success: false, message: 'OpenClaw CLI not installed. Run: npm install -g openclaw' };
    }

    try {
      execSync(`openclaw config set channels.discord.token '"${token}"' --json`, { stdio: 'ignore' });
      execSync('openclaw config set channels.discord.enabled true --json', { stdio: 'ignore' });
      execSync('openclaw config set gateway.mode local', { stdio: 'ignore' });
      return { success: true, message: 'OpenClaw configured successfully!' };
    } catch (error: any) {
      return { success: false, message: `Failed to configure OpenClaw: ${error.message}` };
    }
  }
}
