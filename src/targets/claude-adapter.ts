import fs from 'fs-extra';
import { join } from 'path';
import { BaseTargetAdapter } from './base-adapter.js';
import type { TargetConfig, CopyResult } from './types.js';

/**
 * Claude Code adapter - full feature support
 */
export class ClaudeAdapter extends BaseTargetAdapter {
  readonly config: TargetConfig = {
    name: 'claude',
    displayName: 'Claude Code',
    directory: '.claude',
    features: {
      agents: true,
      skills: true,
      commands: true,
      workflows: true,
      router: true,
      hooks: true,
      memory: true,
      scripts: true,
      'output-styles': true
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

    if (items === 'all') {
      await fs.copy(typeDir, destTypeDir, { overwrite: !mergeMode });
      const entries = fs.readdirSync(typeDir).filter(e => e.endsWith('.md') && e !== 'README.md');
      return { copied: entries.map(e => e.replace('.md', '')), skipped: [], errors: [] };
    }

    const copied: string[] = [];
    const skipped: string[] = [];
    const errors: Array<{ item: string; error: string }> = [];

    for (const agent of items) {
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

        await fs.copy(srcPath, destPath, { overwrite: !mergeMode });
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
    const typeDir = join(sourceDir, 'skills');
    const destTypeDir = join(targetDir, 'skills');

    if (!fs.existsSync(typeDir)) {
      return { copied: [], skipped: [], errors: [] };
    }

    await fs.ensureDir(destTypeDir);

    if (items === 'all') {
      await fs.copy(typeDir, destTypeDir, { overwrite: !mergeMode });
      const entries = fs.readdirSync(typeDir).filter(e => {
        const fullPath = join(typeDir, e);
        return fs.statSync(fullPath).isDirectory() && fs.existsSync(join(fullPath, 'SKILL.md'));
      });
      return { copied: entries, skipped: [], errors: [] };
    }

    const copied: string[] = [];
    const skipped: string[] = [];
    const errors: Array<{ item: string; error: string }> = [];

    for (const skill of items) {
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

    if (items === 'all') {
      await fs.copy(typeDir, destTypeDir, { overwrite: !mergeMode });
      const entries = fs.readdirSync(typeDir);
      return { copied: [...new Set(entries.map(e => e.replace('.md', '')))], skipped: [], errors: [] };
    }

    const copied: string[] = [];
    const skipped: string[] = [];
    const errors: Array<{ item: string; error: string }> = [];

    for (const item of items) {
      try {
        const itemPath = join(typeDir, item);
        const itemPathMd = itemPath + '.md';

        let srcPath: string | null = null;
        if (fs.existsSync(itemPath)) {
          srcPath = itemPath;
        } else if (fs.existsSync(itemPathMd)) {
          srcPath = itemPathMd;
        }

        if (!srcPath) {
          skipped.push(item);
          continue;
        }

        const stat = fs.statSync(srcPath);
        const destPath = stat.isDirectory()
          ? join(destTypeDir, item)
          : join(destTypeDir, item + '.md');

        if (mergeMode && fs.existsSync(destPath)) {
          skipped.push(item);
          continue;
        }

        await fs.copy(srcPath, destPath, { overwrite: !mergeMode });
        copied.push(item);
      } catch (err: any) {
        errors.push({ item, error: err.message });
      }
    }

    return { copied, skipped, errors };
  }

  async copyWorkflows(
    items: string[] | 'all',
    sourceDir: string,
    targetDir: string,
    mergeMode: boolean
  ): Promise<CopyResult> {
    const typeDir = join(sourceDir, 'workflows');
    const destTypeDir = join(targetDir, 'workflows');

    if (!fs.existsSync(typeDir)) {
      return { copied: [], skipped: [], errors: [] };
    }

    await fs.ensureDir(destTypeDir);

    if (items === 'all') {
      await fs.copy(typeDir, destTypeDir, { overwrite: !mergeMode });
      const entries = fs.readdirSync(typeDir);
      return { copied: entries.map(e => e.replace('.md', '')), skipped: [], errors: [] };
    }

    const copied: string[] = [];
    const skipped: string[] = [];
    const errors: Array<{ item: string; error: string }> = [];

    for (const item of items) {
      try {
        const srcPath = join(typeDir, item + '.md');

        if (!fs.existsSync(srcPath)) {
          skipped.push(item);
          continue;
        }

        const destPath = join(destTypeDir, item + '.md');

        if (mergeMode && fs.existsSync(destPath)) {
          skipped.push(item);
          continue;
        }

        await fs.copy(srcPath, destPath, { overwrite: !mergeMode });
        copied.push(item);
      } catch (err: any) {
        errors.push({ item, error: err.message });
      }
    }

    return { copied, skipped, errors };
  }

  async copyRouter(
    sourceDir: string,
    targetDir: string,
    mergeMode: boolean
  ): Promise<{ success: boolean; error?: string }> {
    return this.copyDirectory('router', sourceDir, targetDir, mergeMode);
  }

  async copyHooks(
    sourceDir: string,
    targetDir: string,
    mergeMode: boolean
  ): Promise<{ success: boolean; error?: string }> {
    return this.copyDirectory('hooks', sourceDir, targetDir, mergeMode);
  }

  async copyExtras(
    sourceDir: string,
    targetDir: string,
    mergeMode: boolean
  ): Promise<string[]> {
    const extras = ['memory', 'output-styles', 'scripts'];
    const copied: string[] = [];

    for (const extra of extras) {
      const result = await this.copyDirectory(extra, sourceDir, targetDir, mergeMode);
      if (result.success) {
        copied.push(extra);
      }
    }

    return copied;
  }

  async copyBaseFiles(
    targetDir: string,
    mergeMode: boolean
  ): Promise<string[]> {
    const { CLI_ROOT } = await import('../utils/paths.js');
    const sourceDir = join(CLI_ROOT, 'templates');
    const baseFiles = ['README.md', 'settings.json', 'settings.local.json', '.env.example', 'statusline.cjs', 'statusline.ps1', 'statusline.sh'];
    const copied: string[] = [];

    for (const file of baseFiles) {
      const srcPath = join(sourceDir, file);
      const destPath = join(targetDir, file);

      if (await this.copyFile(srcPath, destPath, mergeMode)) {
        copied.push(file);
      }
    }

    return copied;
  }

  /**
   * Copy entire source directory to target (simple full copy)
   */
  async copyFullSource(
    sourceDir: string,
    targetDir: string,
    mergeMode: boolean
  ): Promise<{ success: boolean; copiedItems: string[] }> {
    const copiedItems: string[] = [];

    // Get all items in source
    const items = await fs.readdir(sourceDir);

    for (const item of items) {
      const srcPath = join(sourceDir, item);
      const destPath = join(targetDir, item);

      // Skip if merge mode and exists
      if (mergeMode && await fs.pathExists(destPath)) {
        continue;
      }

      await fs.copy(srcPath, destPath, { overwrite: !mergeMode });
      copiedItems.push(item);
    }

    return { success: true, copiedItems };
  }
}
